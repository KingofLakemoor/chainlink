import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const ids = ['401889761', '401889775'];
    for (const id of ids) {
        const picksSnap = await adminDb.collection('picks').where('matchupId', '==', id).get();
        picksSnap.docs.forEach(d => {
            console.log(`Pick found for ${id}! ID: ${d.id}, User: ${d.data().userId}`);
        });
        const pickemSnap = await adminDb.collection('pickemPicks').where('matchupId', '==', id).get();
        pickemSnap.docs.forEach(d => {
            console.log(`Pickem Pick found for ${id}! ID: ${d.id}, User: ${d.data().participantId}`);
        });
    }
}
run().catch(console.error).finally(() => process.exit(0));
