const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
    /match \/squads\/\{squadId\} \{\s*allow read: if isSignedIn\(\);\s*allow create, update, delete: if isAdmin\(\); \/\/ Managed primarily via backend or admin\s*\}/,
    `match /squads/{squadId} {
      allow read: if isSignedIn();
      allow create, update: if isAdmin() && (!incoming().keys().hasAny(['description']) || (incoming().description is string && incoming().description.size() <= 2000));
      allow delete: if isAdmin();
    }`
);

content = content.replace(
    /match \/pickemMatchups\/\{matchupId\} \{\s*allow read: if isSignedIn\(\);\s*allow write: if isAdmin\(\);\s*\}/,
    `match /pickemMatchups/{matchupId} {
      allow read: if isSignedIn();
      allow create, update: if isAdmin() && !incoming().keys().hasAny(['isSecret']);
      allow delete: if isAdmin();
    }`
);

fs.writeFileSync('firestore.rules', content);
console.log("Patched squads and pickemMatchups rules successfully");
