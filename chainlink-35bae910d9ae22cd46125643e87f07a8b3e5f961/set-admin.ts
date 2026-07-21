import { adminDb } from './src/lib/firebase-admin.ts';

async function setAdmin() {
  const email = 'kingoflakemoor@gmail.com';
  console.log(`Setting admin role for ${email}...`);
  try {
    if (!adminDb) {
      throw new Error("Admin SDK DB not available.");
    }
    const usersRef = adminDb.collection('users');
    const q = await usersRef.where('email', '==', email).get();

    if (q.empty) {
      console.error(`User with email ${email} not found in Firestore. Please log in to the application at least once so your account is created.`);
      return;
    }

    for (const doc of q.docs) {
      console.log(`Found user document: ${doc.id}`);
      await doc.ref.update({
        role: 'ADMIN'
      });
      console.log(`Successfully updated ${email} to ADMIN role in document ${doc.id}.`);
    }
  } catch (error: any) {
    console.error("Error setting admin role:", error);
  }
}

setAdmin();
