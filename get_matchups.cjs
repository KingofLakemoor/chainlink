const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const m = await db.collection('matchups').limit(5).get();
  m.forEach(doc => {
    const data = doc.data();
    console.log(data.gameId, data.league, data.awayTeam?.image, data.homeTeam?.image);
  });
}
run();
