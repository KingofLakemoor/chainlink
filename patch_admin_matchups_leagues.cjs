const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/matchups/AdminMatchups.tsx', 'utf8');

// Replace the hardcoded array in handleSync
code = code.replace(
  "const leaguesToSync = leagueFilter === 'All' ? ['MLB', 'NBA', 'NBASL', 'NHL', 'PGA', 'NFL', 'CFB', 'WNBA', 'CFL', 'WBB', 'MBB', 'MLS', 'LMX', 'EPL', 'NWSL', 'CBASE', 'FIFA', 'FRA', 'TUR', 'RPL', 'CHN', 'ATP', 'WTA', 'CRICKET'] : [leagueFilter];",
  "const leaguesToSync = leagueFilter === 'All' ? ['MLB', 'NBA', 'NBASL', 'NHL', 'PGA', 'NFL', 'CFB', 'WNBA', 'CFL', 'WBB', 'MBB', 'MLS', 'LMX', 'EPL', 'NWSL', 'CBASE', 'FIFA', 'FRA', 'TUR', 'RPL', 'CHN', 'ATP', 'WTA', 'CRICKET', 'PROP'] : [leagueFilter];"
);

// Also add PROP to the filter dropdown
code = code.replace(
  '["MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"]',
  '["MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET", "PROP"]'
);

fs.writeFileSync('src/pages/admin/matchups/AdminMatchups.tsx', code);
