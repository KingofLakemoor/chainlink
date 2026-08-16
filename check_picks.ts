import { adminDb } from './src/lib/firebase-admin.js';

async function main() {
    const snap = await adminDb.collection('matchups').where('league', 'in', ['ARG', 'LMX']).get();
    for (const doc of snap.docs) {
        if (doc.data().status === 'STATUS_SCHEDULED') {
            const picks = await adminDb.collection('picks').where('matchupId', '==', doc.id).get();
            const pickemPicks = await adminDb.collection('pickemPicks').where('matchupId', '==', doc.id).get();
            if (!picks.empty || !pickemPicks.empty) {
                console.log(doc.id, doc.data().title, 'HAS PICKS!', picks.size, pickemPicks.size);
            } else {
                console.log(doc.id, doc.data().title, 'No picks');
            }
        }
    }
}
main();
