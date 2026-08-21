const fs = require('fs');
const file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

const target = `    match /system_errors/{errorId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }`;

code = code.replace(target, '');

const insertTarget = `    match /{document=**} {
      allow read, write: if false; 
    }`;

const insertRepl = `    match /{document=**} {
      allow read, write: if false; 
    }

    match /system_errors/{errorId} {
      allow read, write: if true;
    }`;

code = code.replace(insertTarget, insertRepl);
fs.writeFileSync(file, code);
