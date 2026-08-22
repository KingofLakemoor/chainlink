import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'NFL').limit(2).get();
    if (snap.empty) {
        console.log("No NFL matchups found");
    } else {
        snap.docs.forEach(doc => console.log(JSON.stringify(doc.data(), null, 2)));
    }
}
run().catch(console.error).then(() => process.exit(0));
