import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    console.log("Checking pickemPicks for", userId);
    const picksSnap = await adminDb.collection('pickemPicks').where('participantId', '==', userId).get();
    
    for (const d of picksSnap.docs) {
        const data = d.data();
        const mDoc = await adminDb.collection('pickemMatchups').doc(data.matchupId).get();
        const m = mDoc.data();
        console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${data.pick}, Status: ${data.status}, Matchup Title: ${m?.title || m?.name || 'UNKNOWN/DELETED'}, Matchup Status: ${m?.status}, League: ${m?.league}`);
    }
}
run().catch(console.error).finally(() => process.exit(0));
