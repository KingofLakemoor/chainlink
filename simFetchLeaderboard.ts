import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const campaignIds = ['aUqhDhT3vKWfkPgSAVzf'];
  const participantStats: Record<string, { wins: number, losses: number, pushes: number, points: number, picks: any[] }> = {};

  const partSnaps = await Promise.all(
    campaignIds.map(cid => adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get())
  );

  partSnaps.forEach(snap => {
    snap.docs.forEach(d => {
      const data = d.data();
      const pId = data.participantId || data.userId;
      if (pId && !participantStats[pId]) {
        participantStats[pId] = { wins: 0, losses: 0, pushes: 0, points: 0, picks: [] };
      }
    });
  });

  const pSnaps = await Promise.all(
    campaignIds.map(cid => adminDb.collection('pickemPicks').where('campaignId', '==', cid).get())
  );

  const processedPickIds = new Set<string>();
  pSnaps.forEach(snap => {
    snap.docs.forEach(d => {
      if (processedPickIds.has(d.id)) return;
      processedPickIds.add(d.id);

      const pick = { id: d.id, ...d.data() } as any;
      const pId = pick.participantId || pick.userId;
      if (!pId) return;

      if (!participantStats[pId]) {
        participantStats[pId] = { wins: 0, losses: 0, pushes: 0, points: 0, picks: [] };
      }

      participantStats[pId].picks.push(pick);

      if (pick.status === 'WIN') {
        participantStats[pId].wins += 1;
        participantStats[pId].points += pick.pointsEarned || 1;
      } else if (pick.status === 'LOSS') {
        participantStats[pId].losses += 1;
      } else if (pick.status === 'PUSH') {
        participantStats[pId].pushes += 1;
      }
    });
  });

  const participantIds = Object.keys(participantStats);
  console.log('Participant IDs count:', participantIds.length);
  const formattedLeaderboard = participantIds.map(uid => {
    return {
      uid,
      name: uid,
      ...participantStats[uid]
    };
  }).sort((a, b) => b.points - a.points);
  
  formattedLeaderboard.forEach(f => {
      if (f.name === 'oAehm3hCCqRaimY14fQ0B7yuzYP2') {
          console.log('cpr1staid stats:', f);
      }
  });
  console.log('Top 3:', formattedLeaderboard.slice(0, 3));
}
run();
