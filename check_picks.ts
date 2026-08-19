import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    console.log("--- All Matchups (including non-LLWS that might be manually created) ---");
    const mSnap = await adminDb.collection('matchups').get();
    const allMatchups = new Map();
    mSnap.docs.forEach(d => {
        const data = d.data();
        allMatchups.set(d.id, data);
        if (data.league === 'LLWS' || data.title?.includes('LLWS') || data.name?.includes('LLWS')) {
            console.log(`Matchup ID: ${d.id}, Title: ${data.title}, League: ${data.league}, Status: ${data.status}`);
        }
    });

    console.log("\n--- User Picks ---");
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    if (userSnap.empty) {
        console.log("User not found");
        return;
    }
    const userId = userSnap.docs[0].id;
    console.log(`User ID: ${userId}`);

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    picksSnap.docs.forEach(d => {
        const data = d.data();
        const m = allMatchups.get(data.matchupId);
        console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${data.pick}, Status: ${data.status}, Matchup Title: ${m?.title || 'UNKNOWN/DELETED'}, Matchup Status: ${m?.status}`);
    });
}
run().catch(console.error).finally(() => process.exit(0));
