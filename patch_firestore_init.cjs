const fs = require('fs');
const file = 'src/lib/firebase.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('initializeFirestore')) {
  code = code.replace(
    `import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore, arrayRemove } from 'firebase/firestore';`,
    `import { getFirestore, initializeFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore, arrayRemove, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';`
  );
}

const target = `    const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (isCustomProject ? '(default)' : firebaseConfig.firestoreDatabaseId);
    db = getFirestore(app, databaseId);`;

const repl = `    const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (isCustomProject ? '(default)' : firebaseConfig.firestoreDatabaseId);
    // Explicitly initialize Firestore to handle offline cache issues gracefully (like the "client is offline" error)
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
      }, databaseId);
    } catch (innerErr: any) {
      // If initializeFirestore fails (already initialized), fallback to getFirestore
      db = getFirestore(app, databaseId);
    }`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched Firestore init!");
} else {
  console.log("Could not find target in firebase.ts.");
}
