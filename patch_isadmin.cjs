const fs = require('fs');
const file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

const target = `    function isAdmin() {
        return isSignedIn() &&
               exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }`;

const repl = `    function isAdmin() {
        return isSignedIn() &&
               exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', '') == "ADMIN";
    }`;

code = code.replace(target, repl);
fs.writeFileSync(file, code);
