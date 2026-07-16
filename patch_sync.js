import fs from 'fs';
const content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const newContent = content.replace(
  'const result = await syncLeagueSchedules(league);',
  `const result = await syncLeagueSchedules(league);

    // Call process-notifications internally to avoid requiring a separate cron job
    try {
      const port = process.env.PORT || 3000;
      await fetch(\`http://localhost:\${port}/api/admin/process-notifications\`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
    } catch (notifErr) {
      console.error('Failed to trigger process-notifications from sync-schedules:', notifErr);
    }`
);

fs.writeFileSync('src/apiRouter.ts', newContent);
console.log('Patched');
