import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  const doc = await adminDb!.collection('pickemCampaigns').doc('aUqhDhT3vKWfkPgSAVzf').get();
  console.log(doc.data());
}
run();
