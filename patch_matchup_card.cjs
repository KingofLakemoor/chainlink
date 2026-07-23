const fs = require('fs');
let code = fs.readFileSync('src/components/ui/MatchupCard.tsx', 'utf8');

const getFixedSrc = (teamStr) => {
    return `(m.${teamStr}.image && m.${teamStr}.image.startsWith('/contestants/') ? 'https://scriptless.club602.com' + m.${teamStr}.image : m.${teamStr}.image)`;
};

const getCondition = (teamStr) => {
    return `(m.league === 'SCRIPTLESS' || (m.${teamStr}.image && m.${teamStr}.image.startsWith('/contestants/')))`;
};

// Replace away team
let matchAway = `<FirebaseImage fallback={m.league === 'SCRIPTLESS' ? '/images/scriptless.png' : undefined} fallbackIcon={m.league === 'SCRIPTLESS' ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === 'OVER_UNDER' ? '/images/over.png' : m.awayTeam.image}`;
let replaceAway = `<FirebaseImage fallback={${getCondition('awayTeam')} ? '/images/scriptless.png' : undefined} fallbackIcon={${getCondition('awayTeam')} ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === 'OVER_UNDER' ? '/images/over.png' : ${getFixedSrc('awayTeam')}}`;

code = code.replace(matchAway, replaceAway);

// Replace home team
let matchHome = `<FirebaseImage fallback={m.league === 'SCRIPTLESS' ? '/images/scriptless.png' : undefined} fallbackIcon={m.league === 'SCRIPTLESS' ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === 'OVER_UNDER' ? '/images/under.png' : m.homeTeam.image}`;
let replaceHome = `<FirebaseImage fallback={${getCondition('homeTeam')} ? '/images/scriptless.png' : undefined} fallbackIcon={${getCondition('homeTeam')} ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === 'OVER_UNDER' ? '/images/under.png' : ${getFixedSrc('homeTeam')}}`;

code = code.replace(matchHome, replaceHome);

fs.writeFileSync('src/components/ui/MatchupCard.tsx', code);
