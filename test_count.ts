import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('users').count().get();
    console.log("Count:", snap.data().count);
}
run().catch(console.error).then(() => process.exit(0));
