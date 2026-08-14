import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'RPL').where('active', '==', true).get();
    console.log(`Found ${snap.size} active RPL matchups. Checking odds...`);
    
    let deactivated = 0;
    const batch = adminDb.batch();
    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.metadata?.mlHome === null || data.metadata?.mlHome === undefined) {
            batch.update(doc.ref, { active: false, updatedAt: Date.now() });
            console.log(`Deactivating ${data.title}`);
            deactivated++;
        }
    }
    
    if (deactivated > 0) {
        await batch.commit();
        console.log(`Successfully deactivated ${deactivated} RPL matchups without odds.`);
    } else {
        console.log('No RPL matchups needed deactivation.');
    }
}
run();
