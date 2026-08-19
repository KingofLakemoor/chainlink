import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const picksSnap = await adminDb.collection('picks').get();
    for (const d of picksSnap.docs) {
        const data = d.data();
        const pickName = data.pick?.name || '';
        // If pickname matches known LLWS teams
        if (pickName.includes('IA') || pickName.includes('WI') || pickName.includes('WA') || pickName.includes('ID') || pickName.includes('DOM') || pickName.includes('NCA') || pickName.includes('AL') || pickName.includes('NJ') || pickName.includes('CAN') || pickName.includes('KOR') || pickName.includes('AUS') || pickName.includes('MEX') || pickName.includes('OH') || pickName.includes('NV') || pickName.includes('JPN') || pickName.includes('CUW') || pickName.includes('CA') || pickName.includes('MA') || pickName.includes('PA') || pickName.includes('FL')) {
            console.log(`Picks: ID ${d.id}, User: ${data.userId}, Matchup: ${data.matchupId}, Pick: ${pickName}, Status: ${data.status}`);
        }
    }
    
    const pickemSnap = await adminDb.collection('pickemPicks').get();
    for (const d of pickemSnap.docs) {
        const data = d.data();
        const pickName = data.pick || '';
        // In pickem, pick is usually just a string or team ID
        console.log(`Pickem: ID ${d.id}, Matchup: ${data.matchupId}, Pick: ${pickName}`);
    }
}
run().catch(console.error).finally(() => process.exit(0));
