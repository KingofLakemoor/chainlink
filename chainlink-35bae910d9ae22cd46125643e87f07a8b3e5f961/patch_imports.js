import fs from 'fs';
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// Remove the inline imports we just added
content = content.replace("import { getMessaging, getToken, deleteToken } from 'firebase/messaging';\nimport { arrayRemove } from 'firebase/firestore';\n\nexport const logout", "export const logout");

// Add them to the top if they don't exist
if (!content.includes('import { getMessaging, getToken, deleteToken } from \'firebase/messaging\'')) {
  content = "import { getMessaging, getToken, deleteToken } from 'firebase/messaging';\n" + content;
}

if (!content.includes('arrayRemove')) {
  content = content.replace("import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore } from 'firebase/firestore';", "import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore, arrayRemove } from 'firebase/firestore';");
} else if (content.includes('import { arrayRemove }')) {
  content = content.replace("import { arrayRemove } from 'firebase/firestore';\n", "");
  content = content.replace("import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore } from 'firebase/firestore';", "import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, Firestore, arrayRemove } from 'firebase/firestore';");
}

fs.writeFileSync('src/lib/firebase.ts', content);
