import fs from 'fs';
let code = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf-8');

code = code.replace(
  'const data = pickData;\n            const data = snap.docs[0].data();',
  '// removed duplicate data declaration'
);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', code);
