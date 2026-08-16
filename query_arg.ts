import { adminDb } from './src/lib/firebase-admin.js';

async function main() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'ARG').get();
    for (const doc of snap.docs) {
        console.log(doc.id, doc.data().title, doc.data().status, 'abandoned:', doc.data().abandoned, 'active:', doc.data().active);
    }
}
main();
