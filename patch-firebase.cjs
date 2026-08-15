const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// Remove discord provider definition
code = code.replace(/const discordProvider = new OAuthProvider\('discord\.com'\);\n/, '');
code = code.replace(/discordProvider\.addScope\('identify'\);\n/, '');
code = code.replace(/discordProvider\.addScope\('email'\);\n/, '');

// Remove discord credential parsing
code = code.replace(/      } else if \(parsed\.providerId === 'discord\.com'\) \{\n        \/\/ Use OAuthProvider\.credentialFromJSON if available in the type definitions,\n        \/\/ otherwise we cast to any since we know it exists in the implementation\.\n        cred = \(OAuthProvider as any\)\.credentialFromJSON\(parsed\);\n/, '');

// Remove loginWithDiscord function
const start = code.indexOf('export const loginWithDiscord = async () => {');
const end = code.indexOf('export const loginWithGoogle = async () => {');
if (start !== -1 && end !== -1) {
  code = code.substring(0, start) + code.substring(end);
}

// Remove discord reference in google login error
code = code.replace(/\/\/ Since we are logging in with Google, the collision might be with Discord\n/, '');

fs.writeFileSync('src/lib/firebase.ts', code);
