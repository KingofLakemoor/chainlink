import fs from 'fs';
const content = fs.readFileSync('src/components/ui/NotificationPrompt.tsx', 'utf8');
const newContent = content.replace(
  /const granted = await requestNotificationPermission\(user\.uid, profile\);\n\s*if \(granted\) \{/,
  `const result = await requestNotificationPermission(user.uid, profile);
      if (result.granted) {`
);
fs.writeFileSync('src/components/ui/NotificationPrompt.tsx', newContent);
console.log('patched prompt');
