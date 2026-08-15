import { adminDb } from './src/lib/firebase-admin.js';

async function check() {
    const snap = await adminDb.collection('matchups')
        .where('league', '==', 'ATP')
        .where('active', '==', true)
        .where('status', '==', 'STATUS_SCHEDULED')
        .get();
        
    console.log(`Found ${snap.size} active ATP matchups.`);
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.title} | mlHome: ${data.metadata?.mlHome} | mlAway: ${data.metadata?.mlAway}`);
    });
}
check();
