const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

const targetStr = `    const url = \`https://site.api.espn.com/apis/site/v2/sports/\${sport}/\${leaguePath}/summary?event=\${config.gameId}\`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error(\`Failed to fetch \${config.league} data\`);
    const data = await res.json();`;

const replaceStr = `    let data;
    if (boxscoreCache.has(config.gameId)) {
        data = boxscoreCache.get(config.gameId);
    } else {
        const url = \`https://site.api.espn.com/apis/site/v2/sports/\${sport}/\${leaguePath}/summary?event=\${config.gameId}\`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (!res.ok) throw new Error(\`Failed to fetch \${config.league} data\`);
        data = await res.json();
        boxscoreCache.set(config.gameId, data);
    }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/propGrader.ts', code);
console.log("Patched propGrader.ts with cache");
