import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const pickemSnap = await adminDb.collection('pickemPicks').get();
    pickemSnap.docs.forEach(d => {
        const data = d.data();
        if (data.matchupId && data.matchupId.includes('401896651')) {
            console.log(`Pickem Pick found for Leon game! ID: ${d.id}, User: ${data.participantId}`);
        }
    });

    const picksSnap = await adminDb.collection('picks').where('matchupId', '==', '401896651').get();
    picksSnap.docs.forEach(d => {
        console.log(`Standard Pick found for Leon game! ID: ${d.id}, User: ${d.data().userId}`);
    });
}
run().catch(console.error).finally(() => process.exit(0));
