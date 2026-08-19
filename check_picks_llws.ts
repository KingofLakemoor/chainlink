import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    console.log("Checking picks for LLWS games");
    const llwsGameIds = ['401889761', '401889775', '401896651', '401896652', '401896856', '401896857'];
    
    for (const gameId of llwsGameIds) {
        const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).where('matchupId', '==', gameId).get();
        picksSnap.docs.forEach(d => {
            console.log(`Picks -> Pick ID: ${d.id}, MatchupID: ${gameId}, Pick: ${JSON.stringify(d.data().pick)}, Status: ${d.data().status}`);
        });
        
        // Also check if they had a Pick'em pick
        // Note: Pick'em matchup IDs are usually [campaignId]_[gameId]. 
        // We can query all pickemPicks for this user and filter by gameId
    }

    const pickemPicksSnap = await adminDb.collection('pickemPicks').where('participantId', '==', userId).get();
    pickemPicksSnap.docs.forEach(d => {
        const data = d.data();
        if (llwsGameIds.some(id => data.matchupId.includes(id))) {
            console.log(`PickemPicks -> Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}`);
        }
    });

}
run().catch(console.error).finally(() => process.exit(0));
