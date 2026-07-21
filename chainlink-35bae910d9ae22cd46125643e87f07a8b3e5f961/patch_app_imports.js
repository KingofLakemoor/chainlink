import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importLines = content.split('\n');
const seen = new Set();
const newLines = [];

for (const line of importLines) {
  if (line.includes('import { useNotifications }')) {
    if (seen.has('useNotifications')) {
      continue;
    }
    seen.add('useNotifications');
  }
  newLines.push(line);
}

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
