const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const helpers = `
export function extractLine(str: string | null | undefined): string | null {
    if (!str) return null;
    const match = str.match(/([+-]?\\d+\\.?\\d*)/);
    return match ? match[1] : null;
}

export function getScoreboardUrl(league: string): string | null {
    const urls: Record<string, string> = {
        NFL: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
        NBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
        NHL: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
        MLB: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
        MLS: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard",
        EPL: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
        FIFA: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
        FRA: "https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard",
        TUR: "https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard",
        RPL: "https://site.api.espn.com/apis/site/v2/sports/soccer/rus.1/scoreboard",
        CHN: "https://site.api.espn.com/apis/site/v2/sports/soccer/chn.1/scoreboard",
        CFL: "https://site.api.espn.com/apis/site/v2/sports/football/cfl/scoreboard",
        LMX: "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard",
        CFB: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
        CBASE: "https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard",
        WNBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
        CRICKET: "https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard",
        NWSL: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard"
    };
    return urls[league] || null;
}
`;

code = code.replace("export async function fetchMatchups", helpers + "\\nexport async function fetchMatchups");
fs.writeFileSync('src/services/espnScraper.ts', code);
