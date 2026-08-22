import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'NFL').limit(1).get();
    if (snap.empty) {
        console.log("No NFL matchups found");
    } else {
        console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    }
}
run().catch(console.error).then(() => process.exit(0));
