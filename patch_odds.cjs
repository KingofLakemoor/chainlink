const fs = require('fs');
const file = '/app/applet/src/services/oddsProcessor.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `       if (!matchedIds.has(match.id) && (match as any).active === true) {`;
const replacement = `       if (!matchedIds.has(match.id) && !match.abandoned) {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched oddsProcessor.ts");
} else {
    console.error("Target not found");
}
