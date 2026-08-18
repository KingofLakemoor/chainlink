const fs = require('fs');
const file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

const target = `    match /pickemPicks/{pickId} {
      allow read: if isSignedIn() && (resource == null || existing().participantId == request.auth.uid || isAdmin());
      allow write: if isSignedIn() && (incoming().participantId == request.auth.uid || (resource != null && existing().participantId == request.auth.uid));
    }`;

const repl = `    match /pickemPicks/{pickId} {
      allow read: if isSignedIn() && (resource == null || existing().participantId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && incoming().participantId == request.auth.uid;
      allow update: if isSignedIn() && existing().participantId == request.auth.uid && incoming().participantId == request.auth.uid;
      allow delete: if isSignedIn() && existing().participantId == request.auth.uid;
    }`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched firestore.rules!");
} else {
  console.log("Could not find target in firestore.rules.");
}
