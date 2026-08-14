import * as firebaseAdmin from './src/lib/firebase-admin.js';
async function run() {
    const adminDb = firebaseAdmin.adminDb;
    if (!adminDb) return;
    const snap = await adminDb.collection('matchups').get();
    let tdCount = 0;
    for (const doc of snap.docs) {
        if (doc.id.startsWith('prop_td_')) tdCount++;
    }
    console.log(`Found ${tdCount} Anytime TD props.`);
}
run();
