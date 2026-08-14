import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'ATP').where('title', '==', 'Rinky Hijikata @ Luciano Darderi').get();
    snap.docs.forEach(doc => console.log(JSON.stringify(doc.data(), null, 2)));
}
run();
