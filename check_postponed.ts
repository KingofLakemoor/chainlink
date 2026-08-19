import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const mSnap = await adminDb.collection('matchups').where('status', '==', 'STATUS_POSTPONED').get();
    mSnap.docs.forEach(d => {
        const data = d.data();
        if (data.updatedAt && data.updatedAt > oneDayAgo) {
            console.log(`POSTPONED Matchup ID: ${d.id}, Title: ${data.title}, League: ${data.league}`);
        }
    });
}
run().catch(console.error).finally(() => process.exit(0));
