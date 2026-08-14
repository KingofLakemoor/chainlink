import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'LLWS').get();
    const batch = adminDb.batch();
    snap.docs.forEach(doc => {
        if (doc.data().homeTeam?.name?.includes('TBD') || doc.data().awayTeam?.name?.includes('TBD')) {
            batch.delete(doc.ref);
        }
    });
    await batch.commit();
}
run();
