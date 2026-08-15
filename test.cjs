const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
content = content.replace(
  "incoming().diff(existing()).affectedKeys().hasOnly(['name', 'image', 'settings', 'status', 'updatedAt', 'role', 'fcmTokens'])",
  "incoming().diff(existing()).affectedKeys().hasOnly(['name', 'image', 'settings', 'status', 'updatedAt', 'fcmTokens', 'username', 'usernameLower', 'needsOnboarding'])"
);
fs.writeFileSync('firestore.rules', content);
