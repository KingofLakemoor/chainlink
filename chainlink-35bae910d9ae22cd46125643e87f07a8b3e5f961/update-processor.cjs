const fs = require('fs');
let code = fs.readFileSync('src/services/notificationProcessor.ts', 'utf8');

code = code.replace(
  /const messagePayload = \{\s*notification: \{\s*title: String\(notifData\.title \|\| ''\),\s*body: String\(notifData\.body \|\| ''\)\s*\},\s*data: safeData\s*\};/g,
  `const messagePayload = {
          data: {
            ...safeData,
            title: String(notifData.title || ''),
            body: String(notifData.body || '')
          }
        };`
);

fs.writeFileSync('src/services/notificationProcessor.ts', code);
