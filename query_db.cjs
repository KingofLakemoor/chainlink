const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
async function run() {
  const snap = await db.collection('pickemCampaigns').get();
  snap.forEach(doc => {
    const data = doc.data();
    if (data.name.includes("MLB")) {
      console.log(doc.id, data.name, data.visibleDate, data.gamesBeginDate, data.startDate, data.endDate);
      console.log('visibleDate:', new Date(data.visibleDate).toLocaleString());
      console.log('gamesBeginDate:', new Date(data.gamesBeginDate).toLocaleString());
    }
  });
}
run();
