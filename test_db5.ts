import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const pickemMatchupsSnap = await adminDb.collection('pickemMatchups').get();
  console.log("Total pickemMatchups:", pickemMatchupsSnap.docs.length);
}
run();
