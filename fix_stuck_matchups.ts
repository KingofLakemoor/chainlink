import { adminDb } from './src/lib/firebase-admin.js';

async function main() {
    let count = 0;
    const snap = await adminDb.collection('matchups').where('league', 'in', ['ARG', 'LMX']).get();
    for (const doc of snap.docs) {
        if (doc.data().status === 'STATUS_SCHEDULED') {
            const data = doc.data();
            // If it's more than 48 hours old, abandon it
            if (data.startTime && data.startTime < Date.now() - 48 * 3600 * 1000) {
                console.log('Abandoning', doc.id, data.title, data.league);
                await doc.ref.update({ abandoned: true, active: false });
                count++;
            }
        }
    }
    console.log('Updated', count, 'matchups.');
}
main();
