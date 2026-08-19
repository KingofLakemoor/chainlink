import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    console.log("--- Matchups matching 'Leon' or 'Santiago' ---");
    const mSnap = await adminDb.collection('matchups').get();
    mSnap.docs.forEach(d => {
        const data = d.data();
        if (data.title?.includes('Leon') || data.title?.includes('Santiago') || data.name?.includes('Leon') || data.name?.includes('Santiago')) {
            console.log(`ID: ${d.id}, Title: ${data.title || data.name}, League: ${data.league}, Status: ${data.status}, Abandoned: ${data.abandoned}, Active: ${data.active}`);
        }
    });

    console.log("\n--- User's Picks for these matchups ---");
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;
    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    picksSnap.docs.forEach(d => {
        const data = d.data();
        if (data.pick?.name?.includes('Leon') || data.pick?.name?.includes('Santiago') || data.pick?.name?.includes('DOM') || data.pick?.name?.includes('NCA')) {
            console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}`);
        }
    });
}
run().catch(console.error).finally(() => process.exit(0));
