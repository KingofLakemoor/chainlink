import * as firebaseAdmin from './src/lib/firebase-admin.js';

async function run() {
    const adminDb = firebaseAdmin.adminDb;
    if (!adminDb) {
        console.error("No adminDb");
        return;
    }
    const snap = await adminDb.collection('matchups').where('status', '==', 'STATUS_SCHEDULED').get();
    let batch = adminDb.batch();
    let count = 0;
    for (const doc of snap.docs) {
        const id = doc.id;
        if (id.startsWith('prop_auto_') || id.startsWith('prop_td_')) {
            const data = doc.data();
            if (data.active === true) {
                batch.update(doc.ref, { active: false });
                count++;
            }
        }
    }
    if (count > 0) {
        await batch.commit();
        console.log(`Updated ${count} props to inactive.`);
    } else {
        console.log("No props needed updating.");
    }
}
run();
