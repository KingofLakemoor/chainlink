const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

const targetStr = `    try {
        let sport = '';
        let leaguePath = '';
        switch (config.league) {
            case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
            case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
            case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
            case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
        }
        const url = \`https://site.api.espn.com/apis/site/v2/sports/\${sport}/\${leaguePath}/summary?event=\${config.gameId}\`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (!res.ok) return { status: 'STATUS_IN_PROGRESS' };
        const data = await res.json();
        const statusObj = data.header?.competitions?.[0]?.status;
        const rawStatus = statusObj?.type?.name;
        if (rawStatus === 'STATUS_FINAL') return { status: 'STATUS_FINAL', detail: statusObj?.type?.detail || 'Final' };
        return { 
           status: 'STATUS_IN_PROGRESS', 
           detail: statusObj?.type?.shortDetail || statusObj?.type?.detail,
           period: statusObj?.period
        };
    } catch {
        return { status: 'STATUS_IN_PROGRESS' };
    }`;

const replaceStr = `    try {
        let sport = '';
        let leaguePath = '';
        switch (config.league) {
            case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
            case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
            case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
            case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
        }
        
        let data;
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
                if (!res.ok) throw new Error('Failed to fetch espn');
                return await res.json();
            })();
            boxscoreCache.set(config.gameId, fetchPromise);
            data = await fetchPromise;
            boxscoreCache.set(config.gameId, data);
        }

        const statusObj = data?.header?.competitions?.[0]?.status;
        const rawStatus = statusObj?.type?.name;
        if (rawStatus === 'STATUS_FINAL') return { status: 'STATUS_FINAL', detail: statusObj?.type?.detail || 'Final' };
        return { 
           status: 'STATUS_IN_PROGRESS', 
           detail: statusObj?.type?.shortDetail || statusObj?.type?.detail,
           period: statusObj?.period
        };
    } catch {
        return { status: 'STATUS_IN_PROGRESS' };
    }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/propGrader.ts', code);
console.log("Patched propGrader.ts fallback");
