import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;

const isCustomAdminProject = (projectId && projectId !== firebaseConfig.projectId);
const adminDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (isCustomAdminProject ? '(default)' : firebaseConfig.firestoreDatabaseId);

console.log({
  projectId,
  firebaseConfigProjectId: firebaseConfig.projectId,
  isCustomAdminProject,
  adminDatabaseId
});
