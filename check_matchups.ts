import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const d1 = await adminDb.collection('matchups').doc('401889761').get();
    console.log(JSON.stringify(d1.data(), null, 2));
}
run().catch(console.error).finally(() => process.exit(0));
