import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).where('status', '==', 'PUSH').get();
    for (const d of picksSnap.docs) {
        const data = d.data();
        const mDoc = await adminDb.collection('matchups').doc(data.matchupId).get();
        const m = mDoc.data();
        console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Matchup Title: ${m?.title || 'UNKNOWN/DELETED'}, Matchup Status: ${m?.status}, League: ${m?.league}`);
    }
}
run().catch(console.error).finally(() => process.exit(0));
