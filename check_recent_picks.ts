import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    console.log("Checking picks...");
    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    picksSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt && data.createdAt > twelveHoursAgo) {
            console.log(`Picks: ID ${d.id}, Matchup: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}`);
        }
    });

    console.log("Checking pickem picks...");
    const pickemSnap = await adminDb.collection('pickemPicks').where('participantId', '==', userId).get();
    pickemSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt && data.createdAt > twelveHoursAgo) {
            console.log(`PickemPicks: ID ${d.id}, Matchup: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}`);
        }
    });
}
run().catch(console.error).finally(() => process.exit(0));
