import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignIds = ['yes_day_2026', 'charity', 'YES Day Walk for Autism 2026', 'aUqhDhT3vKWfkPgSAVzf'];
  
  const uids = new Set<string>();
  
  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get();
    snap.forEach(d => {
      const pId = d.data().participantId || d.data().userId || d.id.split('_')[1];
      if (pId) uids.add(pId);
    });
  }

  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemPicks').where('campaignId', '==', cid).get();
    snap.forEach(d => {
      const pId = d.data().participantId || d.data().userId;
      if (pId) uids.add(pId);
    });
  }

  console.log(`Found ${uids.size} unique users. Fetching details...`);
  
  const users = [];
  for (const uid of uids) {
    const doc = await adminDb.collection('users').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      users.push({
        uid,
        username: data?.username || data?.name || 'Unknown',
        email: data?.email || 'No email'
      });
    }
  }
  
  console.log("Users in YES Day pool:");
  users.forEach(u => {
    console.log(`- ${u.username} (${u.email}) [UID: ${u.uid}]`);
  });
}
run();
