import fs from 'fs';
const content = fs.readFileSync('src/pages/profile/ProfilePage.tsx', 'utf8');
const newContent = content.replace(
  /const granted = await requestNotificationPermission\(user\.uid, profile\);\n\s*if \(\!granted\) \{[\s\S]*?return;\n\s*\}/,
  `const result = await requestNotificationPermission(user.uid, profile);
      if (!result.granted) {
        setNotificationsEnabled(false);
        let errorMsg = "Notification permission denied.";
        if (result.reason === 'unsupported') errorMsg = "Push notifications are not supported in this browser.";
        if (result.reason === 'missing_vapid') errorMsg = "Missing VAPID key in environment variables.";
        if (result.reason !== 'denied' && result.reason !== 'unsupported' && result.reason !== 'missing_vapid') errorMsg = \`Error: \${result.reason}\`;
        
        setSettingsMessage({ type: 'error', text: <span>{errorMsg} Please check your <a href="https://support.google.com/chrome/answer/3220216?hl=en&co=GENIE.Platform%3DAndroid" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-400">browser settings</a>.</span> });
        return;
      }`
);
fs.writeFileSync('src/pages/profile/ProfilePage.tsx', newContent);
console.log('patched profile');
