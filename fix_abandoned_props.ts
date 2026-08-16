import { adminDb } from './src/lib/firebase-admin.js';

async function main() {
    const snaps = await adminDb.collection('matchups')
        .where('metadata.isPropMatchup', '==', true)
        .where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_FINAL', 'STATUS_POSTPONED'])
        .get();
        
    let count = 0;
    let batch = adminDb.batch();
    for (const doc of snaps.docs) {
        const data = doc.data();
        if (data.abandoned) continue;
        
        const picksSnap = await adminDb.collection('picks')
            .where('matchupId', '==', doc.id)
            .get(); // both PENDING and GRADED picks! If no picks at all, we can abandon.
            
        if (picksSnap.empty) {
            console.log(`Abandoning prop ${doc.id} (${data.title || 'no title'}) - no picks`);
            batch.update(doc.ref, { abandoned: true, active: false });
            count++;
        }
        
        if (count % 400 === 0 && count > 0) {
            await batch.commit();
            batch = adminDb.batch();
        }
    }
    if (count > 0 && count % 400 !== 0) await batch.commit();
    console.log(`Abandoned ${count} props.`);
    process.exit(0);
}
main().catch(console.error);
