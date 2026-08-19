import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    for (const d of picksSnap.docs) {
        const data = d.data();
        const pickName = data.pick?.name || '';
        if (pickName.includes('IA') || pickName.includes('WI') || pickName.includes('WA') || pickName.includes('ID') || pickName.includes('DOM') || pickName.includes('NCA') || pickName.includes('AL') || pickName.includes('NJ') || pickName.includes('CAN') || pickName.includes('KOR') || pickName.includes('AUS') || pickName.includes('MEX') || pickName.includes('OH') || pickName.includes('NV') || pickName.includes('JPN') || pickName.includes('CUW') || pickName.includes('CA') || pickName.includes('MA') || pickName.includes('PA') || pickName.includes('FL')) {
            console.log(`Pick ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${pickName}, Status: ${data.status}`);
        }
    }
}
run().catch(console.error).finally(() => process.exit(0));
