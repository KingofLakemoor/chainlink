import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const mSnap = await adminDb.collection('matchups').get();
    mSnap.docs.forEach(d => {
        const data = d.data();
        if (d.id.includes('custom') || data.league === 'CUSTOM' || data.type === 'CUSTOM') {
            console.log(`Custom Matchup ID: ${d.id}, Title: ${data.title}, League: ${data.league}, Status: ${data.status}, Abandoned: ${data.abandoned}, Active: ${data.active}`);
        }
    });
}
run().catch(console.error).finally(() => process.exit(0));
