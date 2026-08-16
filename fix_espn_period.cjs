const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

// For the block using comp (around line 730)
code = code.replace(
    /period: 0,\n                         network: comp\.geoBroadcasts/g,
    'period: comp.status?.period || 0,\n                         network: comp.geoBroadcasts'
);

// We keep period: 0 for the Yahoo block
// And for the third and fourth block, they already have period: competition?.status?.period || 0,
// wait, the error from tsc was only for the first two blocks where I put `typeof comp !== 'undefined' ...`
// But wait, the `typeof comp !== 'undefined'` was removed globally in task-458 / 443!
// So let's double check if competition is defined in block 3 & 4.
fs.writeFileSync('src/services/espnScraper.ts', code);
