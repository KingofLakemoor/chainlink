import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const doc = await adminDb.collection('matchups').doc('401816655').get();
  console.log("type:", doc.data()?.type);
}
run();
