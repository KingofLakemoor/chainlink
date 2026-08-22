import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'NFL').get();
    if (snap.empty) {
        console.log("No NFL matchups found");
    } else {
        const doc = snap.docs.find(d => JSON.stringify(d.data()).includes('Lions'));
        if (doc) {
            console.log(JSON.stringify(doc.data(), null, 2));
        } else {
            console.log("No lions match found");
        }
    }
}
run().catch(console.error).then(() => process.exit(0));
