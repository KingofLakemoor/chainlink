const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
initializeApp({ projectId: config.projectId });
const db = getFirestore();
db.settings({ databaseId: config.firestoreDatabaseId || '(default)' });
db.collection('users').doc('oAehm3hCCqRaimY14fQ0B7yuzYP2').get().then(doc => console.log(doc.data())).catch(console.error);
