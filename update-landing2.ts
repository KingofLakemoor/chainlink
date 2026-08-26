import fs from 'fs';
let content = fs.readFileSync('src/pages/pickem/PickEmLandingPage.tsx', 'utf-8');
content = content.replace(
  "{selectedPublicCamp.defaultMatchType === 'SPREAD' ? 'Against the Spread' : 'Moneyline (Straight Up)'}",
  "{selectedPublicCamp.defaultMatchType === 'SPREAD' ? 'Against the Spread' : selectedPublicCamp.defaultMatchType === 'BOTH' ? 'Moneyline / ATS' : 'Moneyline (Straight Up)'}"
);
fs.writeFileSync('src/pages/pickem/PickEmLandingPage.tsx', content);
