import { updateAllProps } from './src/services/propGrader.js';
import admin from 'firebase-admin';

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
// wait a sec to ensure db is setup
updateAllProps().then(() => console.log('Done'));
