import { adminDb } from './src/lib/firebase-admin.ts';

console.log("adminDb projectId:", adminDb?.projectId, "databaseId:", (adminDb as any)?._settings?.databaseId);

