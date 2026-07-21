import fs from 'fs';
const lines = fs.readFileSync('src/pages/play/PlayDashboard.tsx', 'utf8').split('\n');
lines[161] = "      if (filterType === 'available' && (m.status !== 'STATUS_SCHEDULED' || (!!m.startTime && Date.now() >= m.startTime))) return false;";
fs.writeFileSync('src/pages/play/PlayDashboard.tsx', lines.join('\n'));
