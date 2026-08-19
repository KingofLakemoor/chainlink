import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    for (const d of picksSnap.docs) {
        const data = d.data();
        const mDoc = await adminDb.collection('matchups').doc(data.matchupId).get();
        const m = mDoc.data();
        if (m && m.league === 'LLWS') {
            console.log(`Pick ID: ${d.id}, Matchup: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}, Matchup Title: ${m.title}`);
        }
    }
}
run().catch(console.error).finally(() => process.exit(0));
