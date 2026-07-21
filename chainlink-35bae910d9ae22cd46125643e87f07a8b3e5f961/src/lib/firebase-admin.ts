import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

// In Cloud Run, applicationDefault() will pick up the compute identity.
// For local deployments or VPS, we support passing the service account JSON
// via the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
      });
    }
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
    // Fallback if needed, though without secrets it can't be admin local
  }
}

const isCustomAdminProject = (projectId && projectId !== firebaseConfig.projectId);
const adminDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (isCustomAdminProject ? '(default)' : firebaseConfig.firestoreDatabaseId);
export const adminDb = getApps().length ? getFirestore(undefined, adminDatabaseId) : null;
export const adminAuth = getApps().length ? getAuth() : null;
export const adminMessaging = getApps().length ? getMessaging() : null;
