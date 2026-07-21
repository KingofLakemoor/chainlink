import fs from 'fs';
const content = fs.readFileSync('src/services/notificationProcessor.ts', 'utf8');

const updatedContent = content.replace(
  "      } else if (audience === 'GLOBAL') {",
  `      } else if (audience === 'ADMIN') {
        const adminsSnap = await adminDb.collection('users').where('role', '==', 'ADMIN').get();
        adminsSnap.forEach(u => {
          const tokens = u.data().fcmTokens;
          if (Array.isArray(tokens)) {
            targetTokens.push(...tokens);
          }
        });
      } else if (audience === 'GLOBAL') {`
);

fs.writeFileSync('src/services/notificationProcessor.ts', updatedContent);
