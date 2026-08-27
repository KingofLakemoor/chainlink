import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) { console.error("No adminDb"); return; }
  console.log("adminDb config:", (adminDb as any).projectId, adminDb.databaseId);
  try {
    const snap = await adminDb.collection('link4Matchups').limit(1).get();
    console.log("Success! Docs:", snap.docs.length);
  } catch (e: any) {
    console.error("Error connecting to adminDb:", e.message);
  }
}
run();
