const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

const targetStr = `    let data;
    if (boxscoreCache.has(config.gameId)) {
        data = boxscoreCache.get(config.gameId);
    } else {
        const url = \`https://site.api.espn.com/apis/site/v2/sports/\${sport}/\${leaguePath}/summary?event=\${config.gameId}\`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (!res.ok) throw new Error(\`Failed to fetch \${config.league} data\`);
        data = await res.json();
        boxscoreCache.set(config.gameId, data);
    }`;

const replaceStr = `    let data;
    if (boxscoreCache.has(config.gameId)) {
        const cached = boxscoreCache.get(config.gameId);
        if (cached instanceof Promise) {
            data = await cached;
        } else {
            data = cached;
        }
    } else {
        const fetchPromise = (async () => {
            const url = \`https://site.api.espn.com/apis/site/v2/sports/\${sport}/\${leaguePath}/summary?event=\${config.gameId}\`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            if (!res.ok) throw new Error(\`Failed to fetch \${config.league} data\`);
            return await res.json();
        })();
        
        boxscoreCache.set(config.gameId, fetchPromise);
        data = await fetchPromise;
        // Replace promise with actual data once resolved to save memory/avoid promise resolution overhead on every hit
        boxscoreCache.set(config.gameId, data);
    }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/propGrader.ts', code);
console.log("Patched propGrader.ts with inflight cache");
