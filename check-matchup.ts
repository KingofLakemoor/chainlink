import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  const m = await adminDb!.collection('pickemMatchups').doc('aUqhDhT3vKWfkPgSAVzf_1_401872656').get();
  console.log(m.data());
}
run();
