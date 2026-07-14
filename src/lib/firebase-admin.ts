import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

// In Cloud Run, applicationDefault() will pick up the compute identity.
// For local deployments or VPS, we support passing the service account JSON
// via the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      });
    }
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
    // Fallback if needed, though without secrets it can't be admin local
  }
}

const isCustomAdminProject = (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== firebaseConfig.projectId);
const adminDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || (isCustomAdminProject ? '(default)' : firebaseConfig.firestoreDatabaseId);
export const adminDb = getApps().length ? getFirestore(undefined, adminDatabaseId) : null;
export const adminAuth = getApps().length ? getAuth() : null;
