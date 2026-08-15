import { adminDb } from './src/lib/firebase-admin.js';

async function verify() {
    const snap = await adminDb.collection('matchups')
        .where('league', '==', 'ATP')
        .where('active', '==', true)
        .where('status', '==', 'STATUS_SCHEDULED')
        .get();
    
    console.log(`Active ATP matchups: ${snap.size}`);
}
verify();
