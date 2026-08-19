import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    
    // get 24 hours ago
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    for (const d of picksSnap.docs) {
        const data = d.data();
        if (data.createdAt && data.createdAt > oneDayAgo) {
            const mDoc = await adminDb.collection('matchups').doc(data.matchupId).get();
            const m = mDoc.data();
            console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${data.pick?.name}, Status: ${data.status}, Matchup Title: ${m?.title || m?.name || 'UNKNOWN/DELETED'}, Matchup Status: ${m?.status}, League: ${m?.league}`);
        }
    }
}
run().catch(console.error).finally(() => process.exit(0));
