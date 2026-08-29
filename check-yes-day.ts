import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  const c = await adminDb!.collection('pickemCampaigns').doc('aUqhDhT3vKWfkPgSAVzf').get();
  console.log(c.data());
}
run();
