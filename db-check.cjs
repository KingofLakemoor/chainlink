const admin = require('firebase-admin');
const fs = require('fs');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(fs.readFileSync('./service-account.json', 'utf8')))
    });
}
const db = admin.firestore();

async function check() {
    const snap = await db.collection('matchups')
        .where('league', '==', 'ATP')
        .where('active', '==', true)
        .where('status', '==', 'STATUS_SCHEDULED')
        .get();
        
    console.log(`Found ${snap.size} active ATP matchups.`);
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.title} | mlHome: ${data.metadata?.mlHome} | mlAway: ${data.metadata?.mlAway}`);
    });
}
check();
