const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

initializeApp({
  projectId: config.projectId
});

const db = getFirestore();
db.settings({ databaseId: config.firestoreDatabaseId || '(default)' });

async function run() {
  const doc = await db.collection('users').doc('oAehm3hCCqRaimY14fQ0B7yuzYP2').get();
  console.log(doc.data());
}

run().catch(console.error);
