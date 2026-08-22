import fs from 'fs';
let content = fs.readFileSync('src/components/ui/MatchupCard.tsx', 'utf8');

const target = `{m.type === 'SOCCER_SCORE' ? \`\${m.awayTeam.name} @ \${m.homeTeam.name}\` : m.title}`;

const replacement = `{(m.league === 'NFL' && m.type === 'SPREAD' && m.metadata?.spread !== undefined && !m.title.includes('ATS')) ? \`\${m.title} - ATS\` : (m.type === 'SOCCER_SCORE' ? \`\${m.awayTeam.name} @ \${m.homeTeam.name}\` : m.title)}`;

if (!content.includes(target)) {
    console.error("Target string not found.");
    process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ui/MatchupCard.tsx', content);
