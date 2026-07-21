import fs from 'fs';

const content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const importStatement = "import { processPendingNotifications } from './services/notificationProcessor.js';\n";
const withoutImports = content.includes('notificationProcessor.js') ? content : importStatement + content;

const newRouteLogic = `apiRouter.post("/admin/process-notifications", validateAdmin, async (req, res) => {
  const result = await processPendingNotifications();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});`;

const updatedContent = withoutImports.replace(
  /apiRouter\.post\("\/admin\/process-notifications".*?res\.status\(500\)\.json\(\{ success: false, error: e\.message \}\);\s*\}\s*\}\);/s,
  newRouteLogic
);

const updatedSync = updatedContent.replace(
  /try \{\s*const port = process\.env\.PORT \|\| 3000;\s*await fetch\(`http:\/\/localhost:\$\{port\}\/api\/admin\/process-notifications`.*?} catch \(notifErr\) {[^}]*}\n/s,
  `try {
      await processPendingNotifications();
    } catch (notifErr) {
      console.error('Failed to process notifications from sync-schedules:', notifErr);
    }\n`
);

fs.writeFileSync('src/apiRouter.ts', updatedSync);
