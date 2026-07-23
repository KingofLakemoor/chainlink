import { adminDb } from './src/lib/firebase-admin.js';
import { updateAllProps } from './src/services/propGrader.js';

async function test() {
    await updateAllProps();
    const snap = await adminDb.collection('matchups').where('type', '==', 'STATS').get();
    console.log(JSON.stringify(snap.docs.map(d => d.data()), null, 2));
}

test();
