import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    console.log("--- Matchups ---");
    const mSnap = await adminDb.collection('matchups').where('league', '==', 'LLWS').get();
    mSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}, GameID: ${data.gameId}, Title: ${data.title || data.name}, Status: ${data.status}, Home: ${data.homeTeam?.name}, Away: ${data.awayTeam?.name}`);
    });

    console.log("\n--- Pickem Matchups ---");
    const pmSnap = await adminDb.collection('pickemMatchups').where('league', '==', 'LLWS').get();
    pmSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}, GameID: ${data.gameId}, Title: ${data.title}, Status: ${data.status}`);
    });

    console.log("\n--- Recent Picks for LLWS ---");
    // We don't have league directly on pickemPicks, but we can just grab all and filter if it's small, or match against known IDs
}
run().catch(console.error).finally(() => process.exit(0));
