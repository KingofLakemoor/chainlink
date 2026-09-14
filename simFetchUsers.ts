import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const campaignIds = ['aUqhDhT3vKWfkPgSAVzf'];
  const participantStats: Record<string, { wins: number, losses: number, pushes: number, points: number, picks: any[] }> = {};

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
  const formattedLeaderboard = participantIds.map(uid => {
    return {
      uid,
      ...participantStats[uid]
    };
  }).sort((a, b) => b.points - a.points);
  
  const testUids = ['OjlL3s6INHO3aCzcl4D2kbdyE4V2', 'M6JsyKsxTzNbnqShjz2jQALEQ9U2']; // User491582 and TuaDsnutsinurmouth

  formattedLeaderboard.forEach(f => {
      if (testUids.includes(f.uid)) {
          console.log(`Stats for ${f.uid === 'OjlL3s6INHO3aCzcl4D2kbdyE4V2' ? 'User491582' : 'TuaDsnutsinurmouth'}:`, f.wins, 'Wins,', f.losses, 'Losses,', f.points, 'Points');
      }
  });
}
run();
