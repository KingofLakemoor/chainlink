const fs = require('fs');
const path = './src/components/ui/MatchupCard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `(pickData?.pick?.id === 'OVER' || pickData?.pick?.id === 'yes')`;
const replace1 = `(pickData?.pick?.id === 'OVER' || pickData?.pick?.id === 'yes' || pickData?.pick?.id === m.awayTeam.id)`;

content = content.split(target1).join(replace1);

fs.writeFileSync(path, content);
