import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const mSnap = await adminDb.collection('matchups').get();
    const allMatchups = new Map();
    mSnap.docs.forEach(d => {
        allMatchups.set(d.id, d.data());
    });

    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    picksSnap.docs.forEach(d => {
        const data = d.data();
        const m = allMatchups.get(data.matchupId);
        // Only show if it's PENDING or if the matchup is deleted
        if (data.status === 'PENDING' || !m) {
            console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}, Matchup Title: ${m?.title || 'UNKNOWN/DELETED'}, Matchup Status: ${m?.status}`);
        }
    });
}
run().catch(console.error).finally(() => process.exit(0));
