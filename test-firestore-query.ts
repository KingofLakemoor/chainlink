import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) {
    console.error("adminDb not initialized");
    return;
  }
  try {
    const usersSnap = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
    console.log("Found users with fcmTokens:", usersSnap.size);
  } catch (e) {
    console.error("Error running query:", e);
  }
}
run();
