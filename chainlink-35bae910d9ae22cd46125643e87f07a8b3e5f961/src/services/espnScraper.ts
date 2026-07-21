import { ScriptLessPayload } from '../types/scriptless.js';

export const SUPPORTED_LEAGUES = ["NFL", "NBA", "NBASL", "NHL", "MLB", "MLS", "EPL", "MBB", "WBB", "NWSL", "CFB", "CBASE", "ATP", "WTA", "WNBA", "PGA", "FIFA", "FRA", "TUR", "RPL", "CHN", "CFL", "LMX", "CRICKET", "SCRIPTLESS"] as const;

export type League = typeof SUPPORTED_LEAGUES[number] | string;

export const MATCHUP_FINAL_STATUSES = [
  "STATUS_FINAL",
  "STATUS_FULL_TIME",
  "STATUS_FULL_PEN",
  "STATUS_FINAL_AET",
  "STATUS_FINAL_ET",
  "STATUS_FINAL_OT",
  "STATUS_FORFEIT",
  "STATUS_FINAL_OVERTIME",
  "STATUS_FINAL_SHOOTOUT",
  "STATUS_FINAL_PENALTIES",
  "STATUS_RETIRED",
  "STATUS_WALKOVER",
];

export const MATCHUP_IN_PROGRESS_STATUSES = [
  "STATUS_IN_PROGRESS",
  "STATUS_FIRST_HALF",
  "STATUS_SECOND_HALF",
  "STATUS_HALFTIME",
  "STATUS_END_PERIOD",
  "STATUS_END_QUARTER",
  "STATUS_END_REGULATION",
  "STATUS_END_GAME",
  "STATUS_SHOOTOUT",
  "STATUS_END_OF_EXTRATIME",
  "STATUS_IN_PROGRESS_PEN",
  "STATUS_IN_PROGRESS_ET",
  "STATUS_OVERTIME",
  "STATUS_IN_PROGRESS_PEN_ET",
];

export const MATCHUP_DELAYED_STATUSES = [
  "STATUS_DELAYED",
  "STATUS_RAIN_DELAY",
  "STATUS_DELAY",
  "STATUS_SUSPENDED",
];

export const MATCHUP_POSTPONED_STATUSES = [
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_ABANDONDED",
];

export const MATCHUP_SCHEDULED_STATUSES = ["STATUS_SCHEDULED"];

export const MATCHUP_UNKNOWN_STATUSES = ["STATUS_UNKNOWN"];

export interface LeagueResponse {
  scoreMatchupsCreated: number;
  existingMatchups: number;
  matchupsUpdated: number;
  gamesOnSchedule: number;
  error: string;
  data: any[];
}


const MLC_LOGOS: Record<string, string> = {
  "1381353": "https://upload.wikimedia.org/wikipedia/en/thumb/2/23/Texas_Super_Kings_Logo.svg/250px-Texas_Super_Kings_Logo.svg.png",
  "1381354": "https://upload.wikimedia.org/wikipedia/en/thumb/3/39/Los_Angeles_Knight_Riders_official_logo.svg/250px-Los_Angeles_Knight_Riders_official_logo.svg.png",
  "1381355": "https://upload.wikimedia.org/wikipedia/en/2/2c/MI_New_York_logo.png",
  "1381357": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/San_Francisco_Unicorns_Logo_official.svg/250px-San_Francisco_Unicorns_Logo_official.svg.png",
  "1381359": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Seattle_Orcas_Logo.svg/250px-Seattle_Orcas_Logo.svg.png",
  "1381360": "https://upload.wikimedia.org/wikipedia/en/thumb/d/db/Washington_Freedom_Logo.svg/250px-Washington_Freedom_Logo.svg.png"
};

export function getScheduleEndpoints(league: League, scoreboardOnly: boolean = false, specificDates?: string[]) {
  let dates: string[] = [];

  if (specificDates && specificDates.length > 0) {
    dates = specificDates;
  } else {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const theDayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

    const formatESTDate = (d: Date) => {
      const str = d.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [month, day, year] = str.split("/");
      return `${year}${month}${day}`;
    };
    dates = [yesterday, today, tomorrow, theDayAfterTomorrow].map(formatESTDate);
  }


  // College basketball and PGA always use scoreboard
  if (league === "MBB") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "WBB") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "CBASE") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?dates=${date}&limit=500`);
  }
  if (league === "PGA") {
    return ['https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga'];
  }
  if (league === "ATP") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${date}`);
  }
  if (league === "WTA") {
    return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=${date}`);
  }

  if (league === "SCRIPTLESS") {
    return ['https://scriptless.club602.com/api/chainlink/matchups'];
  }

  // If scoreboardOnly is true, use scoreboard endpoints to save bandwidth
  if (scoreboardOnly) {
    switch (league) {
      case "NFL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date}`);
      case "NBA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`);
      case "NBASL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer/scoreboard?dates=${date}`);
      case "NHL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`);
      case "MLB": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date}`);
      case "MLS": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${date}`);
      case "EPL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date}`);
      case "FIFA": return [`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${new Date().getFullYear()}&limit=300`];
      case "FRA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${date}`);
      case "TUR": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=${date}`);
      case "RPL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/rus.1/scoreboard?dates=${date}`);
      case "CHN": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/chn.1/scoreboard?dates=${date}`);
      case "CFL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/cfl/scoreboard?dates=${date}`);
      case "LMX": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=${date}`);
      case "CFB": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${date}`);
      case "CBASE": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?dates=${date}&limit=500`);
      case "WNBA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${date}`);
      case "ATP": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${date}`);
      case "WTA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=${date}`);
      case "CRICKET": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard?dates=${date}&limit=300`);
      case "NWSL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/nwsl.1/scoreboard?dates=${date}`);
      default: throw new Error(`Unsupported league: ${league}`);
    }
  }

  const estDate = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const year = new Date(estDate).getFullYear();
  switch (league) {
    case "NFL": return [`https://cdn.espn.com/core/nfl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NBA": return [`https://cdn.espn.com/core/nba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NBASL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer/scoreboard?dates=${date}`);
    case "NHL": return [`https://cdn.espn.com/core/nhl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "MLB": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date}`);
    case "MLS": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${date}`);
    case "EPL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date}`);
    case "FIFA": return [`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${year}&limit=300`];
    case "FRA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${date}`);
    case "TUR": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=${date}`);
    case "RPL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/rus.1/scoreboard?dates=${date}`);
    case "CHN": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/chn.1/scoreboard?dates=${date}`);
    case "CFL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/cfl/scoreboard?dates=${date}`);
    case "LMX": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=${date}`);
    case "CFB": return [`https://cdn.espn.com/core/college-football/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "CBASE": return [`https://cdn.espn.com/core/college-baseball/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "WNBA": return [`https://cdn.espn.com/core/wnba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "CRICKET": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard?dates=${date}`);
    case "NWSL": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard?dates=${date}`);
    default: throw new Error(`Unsupported league: ${league}`);
  }
}

export async function fetchScheduleData(endpoint: string, league: League, isScoreboardOnly: boolean = false) {
  const fetchOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  };
  const response = await fetch(endpoint, fetchOptions);
  const data = await response.json();
  const scheduleData: Record<string, any> = {};

  if (league === "SCRIPTLESS") {
    const scriptlessData = data.matchups || [];
    scheduleData["scriptless"] = { games: scriptlessData };
    return scheduleData;
  }

  if (league === "PGA") {
    // For PGA, we merge the scoreboard API data (which contains hole-by-hole stats) into the leaderboard data
    try {
      const sbResponse = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard', fetchOptions);
      const sbData = await sbResponse.json();

      for (const event of (data.events || [])) {
        const sbEvent = sbData.events?.find((e: any) => e.id === event.id);
        if (sbEvent && event.competitions?.[0]?.competitors && sbEvent.competitions?.[0]?.competitors) {
           const sbMap = new Map();
           for (const c of sbEvent.competitions[0].competitors) {
               sbMap.set(c.id, c);
           }

           for (const c of event.competitions[0].competitors) {
               const sbC = sbMap.get(c.id);
               if (sbC && sbC.linescores && c.linescores) {
                   for (const lbLs of c.linescores) {
                       const sbLs = sbC.linescores.find((s: any) => s.period === lbLs.period);
                       if (sbLs && sbLs.linescores) {
                           // Store hole-by-hole stats inside the period's linescore
                           lbLs.holes = sbLs.linescores;
                       }
                   }
               }
           }
        }
      }
    } catch (e) {
      console.error("Error fetching or merging PGA scoreboard data:", e);
    }
  }

  // For scoreboards or leagues already using scoreboard
  if (league === "MBB" || league === "WBB" || league === "PGA" || league === "CBASE" || league === "ATP" || league === "WTA" || league === "FIFA" || league === "CRICKET" || league === "MLB" || league === "NBASL" || league === "LMX" || league === "CFL" || isScoreboardOnly || endpoint.includes('scoreboard')) {
    const seenGameIds = new Set<string>();
    const uniqueEvents = [];

    for (const event of (data.events || [])) {
      if (!seenGameIds.has(event.id)) {
        seenGameIds.add(event.id);
        uniqueEvents.push(event);
      }
    }

    for (const event of uniqueEvents) {
      const date = event.date?.split("T")[0].replace(/-/g, "");
      if (!date) continue;
      if (!scheduleData[date]) scheduleData[date] = { games: [] };
      scheduleData[date].games.push(event);
    }
    return scheduleData;
  }

  const rawSchedule = data?.content?.schedule || {};
  const seenGameIds = new Set<string>();

  for (const day in rawSchedule) {
    const games = rawSchedule[day].games || [];
    const uniqueGames = games.filter((game: any) => {
      if (seenGameIds.has(game.id)) return false;
      seenGameIds.add(game.id);
      return true;
    });

    if (uniqueGames.length > 0) {
      scheduleData[day] = { ...rawSchedule[day], games: uniqueGames };
    }
  }

  return scheduleData;
}

export async function scrapeLeagueSchedules(league: League, scoreboardOnly: boolean = false, scraperConfig?: { maxMoneylineOdds?: number, sportOverrides?: Record<string, number> }, specificDates?: string[]): Promise<LeagueResponse> {
  const response: LeagueResponse = {
    scoreMatchupsCreated: 0,
    existingMatchups: 0,
    matchupsUpdated: 0,
    gamesOnSchedule: 0,
    error: "",
    data: []
  };

  let endpoints: string[] = [];
  try {
    endpoints = getScheduleEndpoints(league, scoreboardOnly, specificDates);
  } catch (err: any) {
    response.error = err.message;
    return response;
  }

  const processedGameIds = new Set<string>();
  const parsedMatchups: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const scheduleData = await fetchScheduleData(endpoint, league, scoreboardOnly);

      for (const day in scheduleData) {
        const games = scheduleData[day].games;
        if (!games) continue;

        for (const game of games) {
          const gameId = String(game.id || (game as ScriptLessPayload).eventId);

          if (league === "SCRIPTLESS") {
            const sm = game as ScriptLessPayload;

            let finalStatus = sm.status || "STATUS_SCHEDULED";
            let finalStatusDesc = finalStatus === "STATUS_SCHEDULED" ? "Upcoming" : (finalStatus === "STATUS_FINAL" ? "Final" : "In Progress");

            parsedMatchups.push({
               gameId: sm.eventId,
               startTime: new Date(sm.startTime).getTime(),
               active: finalStatus === "STATUS_SCHEDULED",
               featured: false,
               title: sm.name,
               league: sm.league,
               status: finalStatus,
               statusDesc: finalStatusDesc,
               type: "SCORE",
               homeTeam: {
                   id: sm.homeTeam.name,
                   name: sm.homeTeam.name,
                   image: sm.homeTeam.logo || "/images/scriptless.png",
                   score: sm.homeTeam.score || 0
               },
               awayTeam: {
                   id: sm.awayTeam.name,
                   name: sm.awayTeam.name,
                   image: sm.awayTeam.logo || "/images/scriptless.png",
                   score: sm.awayTeam.score || 0
               },
               metadata: sm.metadata || {}
            });
            continue;
          }

          if (league === "ATP" || league === "WTA") {
            const tournamentName = game.name;
            const tournamentId = game.id;

            for (const grouping of (game.groupings || [])) {
              if (league === "ATP" && grouping.grouping?.slug !== "mens-singles") {
                  continue;
              }
              if (league === "WTA" && grouping.grouping?.slug !== "womens-singles") {
                  continue;
              }
              if (grouping.grouping?.slug !== "mens-singles" && grouping.grouping?.slug !== "womens-singles") {
                  continue; // We'll stick to singles for now
              }

              for (const comp of (grouping.competitions || [])) {
                  const competitors = comp.competitors || [];
                  if (competitors.length !== 2) continue;

                  const a = competitors[0];
                  const b = competitors[1];

                  // Determine home/away based on explicit designation or default to a/b
                  let awayCompetitor, homeCompetitor;
                  if (a.homeAway === 'away' && b.homeAway === 'home') {
                      awayCompetitor = a;
                      homeCompetitor = b;
                  } else if (a.homeAway === 'home' && b.homeAway === 'away') {
                      awayCompetitor = b;
                      homeCompetitor = a;
                  } else {
                      awayCompetitor = a;
                      homeCompetitor = b;
                  }

                  const homeName = homeCompetitor?.athlete?.displayName || homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || "";
                  const awayName = awayCompetitor?.athlete?.displayName || awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || "";

                  if ((league as any) !== "FIFA" && (homeName.includes("TBD") || awayName.includes("TBD"))) continue;

                  let homeScore = homeCompetitor.linescores ? homeCompetitor.linescores.filter((ls: any) => ls.winner === true).length : 0;
                  let awayScore = awayCompetitor.linescores ? awayCompetitor.linescores.filter((ls: any) => ls.winner === true).length : 0;

                  if (comp.status?.type?.completed === true || comp.status?.type?.name === "STATUS_FINAL" || MATCHUP_FINAL_STATUSES.includes(comp.status?.type?.name || "") || comp.status?.type?.shortDetail?.toLowerCase().includes("final") || comp.status?.type?.detail?.toLowerCase().includes("final")) {
                      if (homeCompetitor.winner === true && homeScore <= awayScore) {
                          homeScore = awayScore + 1;
                      } else if (awayCompetitor.winner === true && awayScore <= homeScore) {
                          awayScore = homeScore + 1;
                      }
                  }

                  const matchupGameId = `${tournamentId}_${comp.id}`;
                  if (processedGameIds.has(matchupGameId)) continue;
                  processedGameIds.add(matchupGameId);

                  let rawStatus = comp.status?.type?.name || "STATUS_SCHEDULED";
                  let finalStatusDesc = comp.status?.type?.shortDetail || "Upcoming";
                  let finalStatus = "STATUS_SCHEDULED";

                  const compState = comp.status?.type?.state || "";
                  const descLower = finalStatusDesc.toLowerCase();
                  const detailLower = (comp.status?.type?.detail || "").toLowerCase();
                  const hasLinescores = (homeCompetitor.linescores && homeCompetitor.linescores.length > 0) || (awayCompetitor.linescores && awayCompetitor.linescores.length > 0);

                  if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes('postponed') || descLower.includes('canceled') || descLower.includes('cancelled') || descLower.includes('abandoned') || detailLower.includes('postponed') || detailLower.includes('canceled') || detailLower.includes('cancelled') || detailLower.includes('abandoned')) {
                      finalStatus = "STATUS_POSTPONED";
                  } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes('suspended') || detailLower.includes('suspended') || descLower.includes('delayed') || detailLower.includes('delayed')) {
                      finalStatus = "STATUS_DELAYED";
                  } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || (comp.status?.type?.completed === true && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus)) || (descLower.includes('final') && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus))) {
                      finalStatus = "STATUS_FINAL";
                  } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || compState === 'in' || (rawStatus === 'STATUS_SCHEDULED' && (hasLinescores || (compState !== 'pre' && comp.status?.period && comp.status?.period > 0))) || (rawStatus === "STATUS_SCHEDULED" && comp.date && Date.now() >= new Date(comp.date).getTime())) {
                      finalStatus = "STATUS_IN_PROGRESS";
                      if (comp.status?.type?.detail && !comp.status.type.detail.toLowerCase().match(/\b(am|pm|edt|est|pdt|pst|cst|cdt)\b/)) {
                          finalStatusDesc = comp.status.type.detail;
                      } else {
                          finalStatusDesc = "In Progress";
                      }

                      if ((league as string) === "CRICKET" && comp.status?.period) {
                          let currentOvers = null;
                          for (const competitor of comp.competitors || []) {
                              const battingLinescore = (competitor.linescores || []).find(
                                  (ls: any) => ls.isBatting === true && ls.period === comp.status.period
                              );
                              if (battingLinescore && battingLinescore.overs !== undefined) {
                                  currentOvers = battingLinescore.overs;
                                  break;
                              }
                          }
                          finalStatusDesc = currentOvers !== null ? `Thru ${currentOvers}` : `Thru ${comp.status.period}`;
                      }
                  } else {
                      finalStatus = "STATUS_SCHEDULED";
                      finalStatusDesc = "Upcoming";
                  }

                  const homeLinescores = homeCompetitor.linescores ? homeCompetitor.linescores.map((ls: any) => ls.value || 0) : [];
                  const awayLinescores = awayCompetitor.linescores ? awayCompetitor.linescores.map((ls: any) => ls.value || 0) : [];

                  parsedMatchups.push({
                     startTime: new Date(comp.date).getTime(),
                     active: true,
                     featured: false,
                     title: `${awayName || 'Away'} @ ${homeName || 'Home'}`,
                     league,
                     type: "MONEYLINE",
                     status: finalStatus,
                     statusDesc: finalStatusDesc,
                     gameId: matchupGameId,
                     homeTeam: {
                       id: String(homeCompetitor.id),
                       name: homeName,
                       image: (league as any === "CRICKET" ? MLC_LOGOS[String(homeCompetitor.id)] : undefined) || homeCompetitor?.athlete?.flag?.href || homeCompetitor?.team?.logo || "/logo.png",
                       score: homeScore
                     },
                     awayTeam: {
                       id: String(awayCompetitor.id),
                       name: awayName,
                       image: (league as any === "CRICKET" ? MLC_LOGOS[String(awayCompetitor.id)] : undefined) || awayCompetitor?.athlete?.flag?.href || awayCompetitor?.team?.logo || "/logo.png",
                       score: awayScore
                     },
                     cost: 0,
                     metadata: {
                       network: comp.geoBroadcasts?.[0]?.media?.shortName || "N/A",
                       tournament: tournamentName,
                       homeLinescores,
                       awayLinescores
                     }
                  });
              }
            }
            continue;
          }

          const competition = game.competitions?.[0];
          if (!competition) continue;

          if (league === "PGA") {
            // PGA auto-generation is disabled in favor of the PGA Matchup Builder.
            // Returning the raw competition data allows scheduleProcessor to update existing manually created matchups.
            parsedMatchups.push({
               league: "PGA",
               isRawPGAData: true,
               competition: competition,
               gameDate: game.date
            });
            continue;
          }

          if (processedGameIds.has(gameId)) continue;
          processedGameIds.add(gameId);


          const competitors = competition.competitors || [];
          const home = competitors.find((c: any) => c.homeAway === "home");
          const away = competitors.find((c: any) => c.homeAway === "away");
          if (!home || !away) continue;

          const homeName = home.team?.name || "";
          const awayName = away.team?.name || "";
          if (league !== "FIFA" && (homeName.includes("TBD") || awayName.includes("TBD"))) continue;

          const gameTime = new Date(game.date).getTime();

          // Try fetching from the top-level odds or fall back to pointSpread/total directly for different sports (like MLB)
          const extractLine = (val: any) => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
              const parsed = parseFloat(val.replace(/[ou]/gi, ''));
              return isNaN(parsed) ? null : parsed;
            }
            return null;
          };

          const overUnderRaw = competition.odds?.[0]?.overUnder ??
                               competition.odds?.[0]?.total?.over?.close?.line ??
                               competition.odds?.[0]?.total?.over?.open?.line ?? null;
          const overUnder = extractLine(overUnderRaw);

          const spreadRaw = competition.odds?.[0]?.spread ??
                            competition.odds?.[0]?.pointSpread?.home?.close?.line ??
                            competition.odds?.[0]?.pointSpread?.home?.open?.line ?? null;
          const spread = extractLine(spreadRaw);
          const network = competition.geoBroadcasts?.[0]?.media?.shortName || "N/A";

          let active = true;
          const mlHome = competition.odds?.[0]?.moneyline?.home?.close?.odds || competition.odds?.[0]?.moneyline?.home?.open?.odds;
          const mlAway = competition.odds?.[0]?.moneyline?.away?.close?.odds || competition.odds?.[0]?.moneyline?.away?.open?.odds;

          let threshold = Math.abs(scraperConfig?.maxMoneylineOdds ?? 300);
          if (scraperConfig?.sportOverrides && scraperConfig.sportOverrides[league] !== undefined) {
            threshold = Math.abs(scraperConfig.sportOverrides[league]);
          }

          if (mlHome) {
            const mlHomeNum = parseInt(mlHome, 10);
            if (!isNaN(mlHomeNum) && (mlHomeNum <= -threshold || mlHomeNum >= threshold)) {
              active = false;
            }
          }

          const details = competition.odds?.[0]?.details;
          if (details && details !== "EVEN") {
            const match = details.match(/([+-]?\d+)/);
            if (match) {
              const detailsNum = parseInt(match[0], 10);
              if (!isNaN(detailsNum) && (detailsNum <= -threshold || detailsNum >= threshold)) {
                active = false;
              }
            }
          }

          if (mlAway) {
            const mlAwayNum = parseInt(mlAway, 10);
            if (!isNaN(mlAwayNum) && (mlAwayNum <= -threshold || mlAwayNum >= threshold)) {
              active = false;
            }
          }

          let homeScore = parseFloat(home.score !== undefined && home.score !== null && home.score !== "" ? home.score : "0");
          if (isNaN(homeScore)) homeScore = 0;
          let awayScore = parseFloat(away.score !== undefined && away.score !== null && away.score !== "" ? away.score : "0");
          if (isNaN(awayScore)) awayScore = 0;

          let rawStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
          let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";
          let finalStatus = "STATUS_SCHEDULED";

          if (league === "FIFA" && (competition.status?.type?.completed === true || competition.status?.type?.name === "STATUS_FINAL" || MATCHUP_FINAL_STATUSES.includes(competition.status?.type?.name || "") || competition.status?.type?.shortDetail?.toLowerCase().includes("final") || competition.status?.type?.detail?.toLowerCase().includes("final"))) {
              let calculatedHomeScore = home.linescores ? home.linescores.filter((ls: any) => ls.winner === true).length : homeScore;
              let calculatedAwayScore = away.linescores ? away.linescores.filter((ls: any) => ls.winner === true).length : awayScore;

              if (home.winner === true && calculatedHomeScore <= calculatedAwayScore) {
                  homeScore = awayScore + 1;
              } else if (away.winner === true && calculatedAwayScore <= calculatedHomeScore) {
                  awayScore = homeScore + 1;
              }
          }

          const descLower = finalStatusDesc.toLowerCase();
          const detailLower = (competition.status?.type?.detail || "").toLowerCase();
          const hasLinescores = (home.linescores && home.linescores.length > 0) || (away.linescores && away.linescores.length > 0);

          if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes('postponed') || descLower.includes('canceled') || descLower.includes('cancelled') || descLower.includes('abandoned') || detailLower.includes('postponed') || detailLower.includes('canceled') || detailLower.includes('cancelled') || detailLower.includes('abandoned')) {
              finalStatus = "STATUS_POSTPONED";
          } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes('suspended') || detailLower.includes('suspended') || descLower.includes('delayed') || detailLower.includes('delayed')) {
              finalStatus = "STATUS_DELAYED";
          } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || (competition.status?.type?.completed === true && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus)) || (descLower.includes('final') && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus))) {
              finalStatus = "STATUS_FINAL";
          } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || competition.status?.type?.state === 'in' || (rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0 || hasLinescores || (competition.status?.type?.state !== 'pre' && competition.status?.period && competition.status?.period > 0))) || (rawStatus === "STATUS_SCHEDULED" && gameTime && Date.now() >= gameTime)) {
              finalStatus = "STATUS_IN_PROGRESS";
              if (league === "MLB" || league === "CBASE") {
                  const detailStr = competition.status?.type?.detail || competition.status?.type?.shortDetail;
                  if (detailStr) {
                      if (detailStr.includes("Bot ")) {
                          finalStatusDesc = detailStr.replace("Bot ", "Bottom ");
                      } else if (detailStr.includes("Mid ")) {
                          finalStatusDesc = detailStr.replace("Mid ", "Middle ");
                      } else {
                          finalStatusDesc = detailStr;
                      }
                  }
              } else if ((league as string) === "CRICKET" && competition.status?.period) {
                  let currentOvers = null;
                  for (const competitor of competition.competitors || []) {
                      const battingLinescore = (competitor.linescores || []).find(
                          (ls: any) => ls.isBatting === true && ls.period === competition.status.period
                      );
                      if (battingLinescore && battingLinescore.overs !== undefined) {
                          currentOvers = battingLinescore.overs;
                          break;
                      }
                  }
                  finalStatusDesc = currentOvers !== null ? `Thru ${currentOvers}` : `Thru ${competition.status.period}`;
              }
          } else {
              finalStatus = "STATUS_SCHEDULED";
              finalStatusDesc = "Upcoming";
          }

          parsedMatchups.push({
             startTime: gameTime,
             active,
             featured: false,
             title: `${away.team.name} @ ${home.team.name}`,
             league,
             type: "SCORE",
             status: finalStatus,
             statusDesc: finalStatusDesc,
             gameId: gameId,
             homeTeam: {
               id: String(home.id),
               name: home.team.name || "Home Team",
               image: (league as any === "CRICKET" ? MLC_LOGOS[String(home.id)] : undefined) || home.team.logo || "/logo.png",
               score: homeScore
             },
             awayTeam: {
               id: String(away.id),
               name: away.team.name || "Away Team",
               image: (league as any === "CRICKET" ? MLC_LOGOS[String(away.id)] : undefined) || away.team.logo || "/logo.png",
               score: awayScore
             },
             cost: 0,
             metadata: {
               network,
               overUnder,
               spread,
               mlHome: mlHome ? parseInt(mlHome, 10) : null,
               mlAway: mlAway ? parseInt(mlAway, 10) : null
             }
          });
        }
      }
    } catch (err: any) {
      console.error(`Endpoint failed: ${endpoint}`, err);
    }
  }

  response.data = parsedMatchups;
  response.gamesOnSchedule = parsedMatchups.length;
  return response;
}
