const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: applicationDefault() });
const db = getFirestore('ai-studio-1613b77c-1870-426f-a112-896d5efd5f69');
async function run() {
  const snap = await db.collection('pickemCampaigns').get();
  console.log("Camps:", snap.docs.map(d => ({id: d.id, isPrivate: d.data().isPrivate, name: d.data().name})));
}
run();
