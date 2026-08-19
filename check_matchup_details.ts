import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const d = await adminDb.collection('matchups').doc('401896651').get();
    console.log(JSON.stringify(d.data(), null, 2));
}
run().catch(console.error).finally(() => process.exit(0));
