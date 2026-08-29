const fs = require('fs');
const file = 'src/pages/link4/Link4Page.tsx';
let content = fs.readFileSync(file, 'utf8');

const patchTarget = `    if (statusStr !== 'STATUS_SCHEDULED' && statusStr !== 'SCHEDULED') return false;`;
const patchReplacement = `    if (statusStr !== 'STATUS_SCHEDULED' && statusStr !== 'SCHEDULED') return false;
    
    const now = Date.now();
    if (m.startTime && m.startTime <= now) return false;`;
content = content.replace(patchTarget, patchReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched Link4Page.tsx availableMatchups lock');
