import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const uid = 'oAehm3hCCqRaimY14fQ0B7yuzYP2'; // cpr1staid
  
  // check if there is a problem fetching user
  const user = await adminDb.collection('users').doc(uid).get();
  console.log('cpr1staid username:', user.data()?.username);
  
  const snap = await adminDb.collection('pickemParticipants').where('participantId', '==', uid).get();
  console.log('Participant records:', snap.size);
  snap.forEach(d => console.log('Participant:', d.id, d.data().campaignId));

  const picksSnap = await adminDb.collection('pickemPicks').where('participantId', '==', uid).get();
  console.log('Picks records:', picksSnap.size);
  let campaignCounts: Record<string, number> = {};
  picksSnap.forEach(d => {
    campaignCounts[d.data().campaignId] = (campaignCounts[d.data().campaignId] || 0) + 1;
  });
  console.log('Picks by campaign:', campaignCounts);
}
run();
