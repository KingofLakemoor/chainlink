import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups')
    .where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS'])
    .limit(1)
    .get();
  
  if (snap.empty) { console.log("Empty"); return; }
  const doc = snap.docs[0];
  const data = doc.data();
  console.log("Team:", data.homeTeam?.name);
  console.log("shortName:", data.homeTeam?.shortName);
  console.log("updatedAt:", data.updatedAt);
  console.log("id:", doc.id);
}
run();
