import { adminDb } from './src/lib/firebase-admin.js';

async function check() {
    const snap = await adminDb.collection('matchups')
        .where('league', '==', 'ATP')
        .where('active', '==', true)
        .where('status', '==', 'STATUS_SCHEDULED')
        .get();
        
    for (const doc of snap.docs) {
        console.log(`Checking ${doc.id}`);
        const pSnap = await adminDb.collection('pickemPicks').where('matchupId', '==', doc.id).get();
        const bSnap = await adminDb.collection('bracketPicks').where('matchupId', '==', doc.id).get();
        console.log(`- pickem: ${pSnap.size} | bracket: ${bSnap.size}`);
    }
}
check();
