import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection("matchups").where("league", "==", "ARG").get();
  console.log("ARG games:", snap.docs.length);
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.homeTeam.name.includes("Tigre") || data.awayTeam.name.includes("Córdoba")) {
      console.log(doc.id, data.awayTeam.name, "@", data.homeTeam.name, data.status, data.statusDesc);
    }
  });
}
run();
