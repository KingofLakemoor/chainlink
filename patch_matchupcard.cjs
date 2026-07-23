const fs = require('fs');
const file = 'src/components/ui/MatchupCard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /m\.awayTeam\.image && m\.awayTeam\.image\.startsWith\('\/contestants\/'\) \? 'https:\/\/scriptless\.club602\.com' \+ m\.awayTeam\.image : m\.awayTeam\.image/g,
  `m.awayTeam.image`
);

code = code.replace(
  /m\.homeTeam\.image && m\.homeTeam\.image\.startsWith\('\/contestants\/'\) \? 'https:\/\/scriptless\.club602\.com' \+ m\.homeTeam\.image : m\.homeTeam\.image/g,
  `m.homeTeam.image`
);

fs.writeFileSync(file, code);
