// src/services/espnScraper.ts
var MATCHUP_FINAL_STATUSES = [
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
  "STATUS_WALKOVER"
];
var MATCHUP_IN_PROGRESS_STATUSES = [
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
  "STATUS_IN_PROGRESS_PEN_ET"
];
var MATCHUP_DELAYED_STATUSES = [
  "STATUS_DELAYED",
  "STATUS_RAIN_DELAY",
  "STATUS_DELAY",
  "STATUS_SUSPENDED"
];
var MATCHUP_POSTPONED_STATUSES = [
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_ABANDONDED"
];
var MLC_LOGOS = {
  "1381353": "https://upload.wikimedia.org/wikipedia/en/thumb/2/23/Texas_Super_Kings_Logo.svg/250px-Texas_Super_Kings_Logo.svg.png",
  "1381354": "https://upload.wikimedia.org/wikipedia/en/thumb/3/39/Los_Angeles_Knight_Riders_official_logo.svg/250px-Los_Angeles_Knight_Riders_official_logo.svg.png",
  "1381355": "https://upload.wikimedia.org/wikipedia/en/2/2c/MI_New_York_logo.png",
  "1381357": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/San_Francisco_Unicorns_Logo_official.svg/250px-San_Francisco_Unicorns_Logo_official.svg.png",
  "1381359": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Seattle_Orcas_Logo.svg/250px-Seattle_Orcas_Logo.svg.png",
  "1381360": "https://upload.wikimedia.org/wikipedia/en/thumb/d/db/Washington_Freedom_Logo.svg/250px-Washington_Freedom_Logo.svg.png"
};
function getScheduleEndpoints(league, scoreboardOnly = false, specificDates) {
  let dates = [];
  if (specificDates && specificDates.length > 0) {
    dates = specificDates;
  } else {
    const today = /* @__PURE__ */ new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1e3);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1e3);
    const theDayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1e3);
    const formatESTDate = (d) => {
      const str = d.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
      const [month, day, year2] = str.split("/");
      return `${year2}${month}${day}`;
    };
    dates = [yesterday, today, tomorrow, theDayAfterTomorrow].map(formatESTDate);
  }
  if (league === "MBB") {
    return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "WBB") {
    return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?groups=50&dates=${date}&limit=500`);
  }
  if (league === "CBASE") {
    return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?dates=${date}&limit=500`);
  }
  if (league === "PGA") {
    return ["https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga"];
  }
  if (league === "ATP") {
    return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${date}`);
  }
  if (league === "WTA") {
    return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=${date}`);
  }
  if (league === "SCRIPTLESS") {
    return ["https://scriptless.club602.com/api/chainlink/matchups"];
  }
  if (scoreboardOnly) {
    switch (league) {
      case "NFL":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date}`);
      case "NBA":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`);
      case "NBASL":
        return dates.flatMap((date) => [
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-las-vegas/scoreboard?dates=${date}`,
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-sacramento/scoreboard?dates=${date}`,
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-california/scoreboard?dates=${date}`,
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-utah/scoreboard?dates=${date}`,
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-orlando/scoreboard?dates=${date}`,
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-golden-state/scoreboard?dates=${date}`
        ]);
      case "NHL":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`);
      case "MLB":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date}`);
      case "MLS":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${date}`);
      case "EPL":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date}`);
      case "FIFA":
        return [`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${(/* @__PURE__ */ new Date()).getFullYear()}&limit=300`];
      case "FRA":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${date}`);
      case "TUR":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=${date}`);
      case "RPL":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/rus.1/scoreboard?dates=${date}`);
      case "CHN":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/chn.1/scoreboard?dates=${date}`);
      case "CFL":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/football/cfl/scoreboard?dates=${date}`);
      case "LMX":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=${date}`);
      case "ARG":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=${date}`);
      case "BRA":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${date}`);
      case "CFB":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${date}`);
      case "CBASE":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?dates=${date}&limit=500`);
      case "WNBA":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${date}`);
      case "ATP":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${date}`);
      case "WTA":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=${date}`);
      case "CRICKET":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard?dates=${date}&limit=300`);
      case "NWSL":
        return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/nwsl.1/scoreboard?dates=${date}`);
      default:
        throw new Error(`Unsupported league: ${league}`);
    }
  }
  const estDate = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/New_York" });
  const year = new Date(estDate).getFullYear();
  switch (league) {
    case "NFL":
      return [`https://cdn.espn.com/core/nfl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NBA":
      return [`https://cdn.espn.com/core/nba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "NBASL":
      return dates.flatMap((date) => [
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-las-vegas/scoreboard?dates=${date}`,
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-sacramento/scoreboard?dates=${date}`,
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-california/scoreboard?dates=${date}`,
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-utah/scoreboard?dates=${date}`,
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-orlando/scoreboard?dates=${date}`,
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba-summer-golden-state/scoreboard?dates=${date}`
      ]);
    case "NHL":
      return [`https://cdn.espn.com/core/nhl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "MLB":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date}`);
    case "MLS":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${date}`);
    case "EPL":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${date}`);
    case "FIFA":
      return [`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${year}&limit=300`];
    case "FRA":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${date}`);
    case "TUR":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=${date}`);
    case "RPL":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/rus.1/scoreboard?dates=${date}`);
    case "CHN":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/chn.1/scoreboard?dates=${date}`);
    case "CFL":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/football/cfl/scoreboard?dates=${date}`);
    case "LMX":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=${date}`);
    case "ARG":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=${date}`);
    case "BRA":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${date}`);
    case "CFB":
      return [`https://cdn.espn.com/core/college-football/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "CBASE":
      return [`https://cdn.espn.com/core/college-baseball/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "WNBA":
      return [`https://cdn.espn.com/core/wnba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];
    case "CRICKET":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/cricket/21266/scoreboard?dates=${date}`);
    case "NWSL":
      return dates.map((date) => `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard?dates=${date}`);
    default:
      throw new Error(`Unsupported league: ${league}`);
  }
}
async function fetchScheduleData(endpoint, league, isScoreboardOnly = false) {
  const fetchOptions = {
    headers: {
      "Accept": "application/json"
    }
  };
  const response = await fetch(endpoint, fetchOptions);
  const data = await response.json();
  const scheduleData = {};
  if (league === "SCRIPTLESS") {
    const scriptlessData = data.matchups || [];
    scheduleData["scriptless"] = { games: scriptlessData };
    return scheduleData;
  }
  if (league === "PGA") {
    try {
      const sbResponse = await fetch("https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard", fetchOptions);
      const sbData = await sbResponse.json();
      for (const event of data.events || []) {
        const sbEvent = sbData.events?.find((e) => e.id === event.id);
        if (sbEvent && event.competitions?.[0]?.competitors && sbEvent.competitions?.[0]?.competitors) {
          const sbMap = /* @__PURE__ */ new Map();
          for (const c of sbEvent.competitions[0].competitors) {
            sbMap.set(c.id, c);
          }
          for (const c of event.competitions[0].competitors) {
            const sbC = sbMap.get(c.id);
            if (sbC && sbC.linescores && c.linescores) {
              for (const lbLs of c.linescores) {
                const sbLs = sbC.linescores.find((s) => s.period === lbLs.period);
                if (sbLs && sbLs.linescores) {
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
  if (league === "MBB" || league === "WBB" || league === "PGA" || league === "CBASE" || league === "ATP" || league === "WTA" || league === "FIFA" || league === "CRICKET" || league === "MLB" || league === "NBASL" || league === "LMX" || league === "ARG" || league === "BRA" || league === "CFL" || isScoreboardOnly || endpoint.includes("scoreboard")) {
    const seenGameIds2 = /* @__PURE__ */ new Set();
    const uniqueEvents = [];
    for (const event of data.events || []) {
      if (!seenGameIds2.has(event.id)) {
        seenGameIds2.add(event.id);
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
  const seenGameIds = /* @__PURE__ */ new Set();
  for (const day in rawSchedule) {
    const games = rawSchedule[day].games || [];
    const uniqueGames = games.filter((game) => {
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
async function scrapeLeagueSchedules(league, scoreboardOnly = false, scraperConfig, specificDates) {
  const response = {
    scoreMatchupsCreated: 0,
    existingMatchups: 0,
    matchupsUpdated: 0,
    gamesOnSchedule: 0,
    error: "",
    data: []
  };
  let endpoints = [];
  try {
    endpoints = getScheduleEndpoints(league, scoreboardOnly, specificDates);
  } catch (err) {
    response.error = err.message;
    return response;
  }
  const processedGameIds = /* @__PURE__ */ new Set();
  const parsedMatchups = [];
  for (const endpoint of endpoints) {
    try {
      const scheduleData = await fetchScheduleData(endpoint, league, scoreboardOnly);
      for (const day in scheduleData) {
        const games = scheduleData[day].games;
        if (!games) continue;
        for (const game of games) {
          const gameId = String(game.id || game.eventId);
          if (league === "SCRIPTLESS") {
            const sm = game;
            let finalStatus = sm.status || "STATUS_SCHEDULED";
            let finalStatusDesc = finalStatus === "STATUS_SCHEDULED" ? "Upcoming" : finalStatus === "STATUS_FINAL" ? "Final" : "In Progress";
            parsedMatchups.push({
              gameId: sm.eventId,
              startTime: new Date(sm.startTime).getTime(),
              active: finalStatus === "STATUS_SCHEDULED",
              featured: true,
              featuredType: "ScriptLess",
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
            for (const grouping of game.groupings || []) {
              if (league === "ATP" && grouping.grouping?.slug !== "mens-singles") {
                continue;
              }
              if (league === "WTA" && grouping.grouping?.slug !== "womens-singles") {
                continue;
              }
              if (grouping.grouping?.slug !== "mens-singles" && grouping.grouping?.slug !== "womens-singles") {
                continue;
              }
              for (const comp of grouping.competitions || []) {
                const competitors = comp.competitors || [];
                if (competitors.length !== 2) continue;
                const a = competitors[0];
                const b = competitors[1];
                let awayCompetitor, homeCompetitor;
                if (a.homeAway === "away" && b.homeAway === "home") {
                  awayCompetitor = a;
                  homeCompetitor = b;
                } else if (a.homeAway === "home" && b.homeAway === "away") {
                  awayCompetitor = b;
                  homeCompetitor = a;
                } else {
                  awayCompetitor = a;
                  homeCompetitor = b;
                }
                const homeName = homeCompetitor?.athlete?.displayName || homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || "";
                const awayName = awayCompetitor?.athlete?.displayName || awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || "";
                if (league !== "FIFA" && (homeName.includes("TBD") || awayName.includes("TBD"))) continue;
                let homeScore = homeCompetitor.linescores ? homeCompetitor.linescores.filter((ls) => ls.winner === true).length : 0;
                let awayScore = awayCompetitor.linescores ? awayCompetitor.linescores.filter((ls) => ls.winner === true).length : 0;
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
                const hasLinescores = homeCompetitor.linescores && homeCompetitor.linescores.length > 0 || awayCompetitor.linescores && awayCompetitor.linescores.length > 0;
                let startTime = comp.date ? new Date(comp.date).getTime() : 0;
                if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes("postponed") || descLower.includes("canceled") || descLower.includes("cancelled") || descLower.includes("abandoned") || detailLower.includes("postponed") || detailLower.includes("canceled") || detailLower.includes("cancelled") || detailLower.includes("abandoned")) {
                  finalStatus = "STATUS_POSTPONED";
                } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes("suspended") || detailLower.includes("suspended") || descLower.includes("delayed") || detailLower.includes("delayed")) {
                  if (compState === "pre") {
                    finalStatus = "STATUS_SCHEDULED";
                    finalStatusDesc = comp.status?.type?.detail || comp.status?.type?.shortDetail || "Delayed";
                    if (startTime > 0 && Date.now() >= startTime) {
                      startTime = Date.now() + 30 * 60 * 1e3;
                    }
                  } else {
                    finalStatus = "STATUS_DELAYED";
                  }
                } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || comp.status?.type?.completed === true && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || descLower.includes("final") && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus)) {
                  finalStatus = "STATUS_FINAL";
                } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || compState === "in" || rawStatus === "STATUS_SCHEDULED" && (hasLinescores || compState !== "pre" && comp.status?.period && comp.status?.period > 0) || rawStatus === "STATUS_SCHEDULED" && startTime > 0 && Date.now() >= startTime) {
                  finalStatus = "STATUS_IN_PROGRESS";
                  if (comp.status?.type?.detail && !comp.status.type.detail.toLowerCase().match(/\b(am|pm|edt|est|pdt|pst|cst|cdt)\b/)) {
                    finalStatusDesc = comp.status.type.detail;
                  } else {
                    finalStatusDesc = "In Progress";
                  }
                  if (league === "CRICKET" && comp.status?.period) {
                    let currentOvers = null;
                    for (const competitor of comp.competitors || []) {
                      const battingLinescore = (competitor.linescores || []).find(
                        (ls) => ls.isBatting === true && ls.period === comp.status.period
                      );
                      if (battingLinescore && battingLinescore.overs !== void 0) {
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
                const homeLinescores = homeCompetitor.linescores ? homeCompetitor.linescores.map((ls) => ls.value || 0) : [];
                const awayLinescores = awayCompetitor.linescores ? awayCompetitor.linescores.map((ls) => ls.value || 0) : [];
                parsedMatchups.push({
                  startTime,
                  active: true,
                  featured: false,
                  title: `${awayName || "Away"} @ ${homeName || "Home"}`,
                  league,
                  type: "MONEYLINE",
                  status: finalStatus,
                  statusDesc: finalStatusDesc,
                  gameId: matchupGameId,
                  homeTeam: {
                    id: String(homeCompetitor.id),
                    name: homeName || "Home Team",
                    image: (league === "CRICKET" ? MLC_LOGOS[String(homeCompetitor.id)] : void 0) || homeCompetitor.team?.logo || "/logo.png",
                    score: homeScore
                  },
                  awayTeam: {
                    id: String(awayCompetitor.id),
                    name: awayName || "Away Team",
                    image: (league === "CRICKET" ? MLC_LOGOS[String(awayCompetitor.id)] : void 0) || awayCompetitor.team?.logo || "/logo.png",
                    score: awayScore
                  },
                  cost: 0,
                  metadata: {
                    network: comp.geoBroadcasts?.[0]?.media?.shortName || "N/A",
                    overUnder: extractLine(comp.odds?.[0]?.overUnder),
                    mlHome: parseInt(comp.odds?.[0]?.moneyline?.home?.close?.odds || comp.odds?.[0]?.moneyline?.home?.open?.odds || "0", 10) || null,
                    mlAway: parseInt(comp.odds?.[0]?.moneyline?.away?.close?.odds || comp.odds?.[0]?.moneyline?.away?.open?.odds || "0", 10) || null,
                    spread: extractLine(comp.odds?.[0]?.spread || comp.odds?.[0]?.pointSpread?.home?.close?.line || comp.odds?.[0]?.pointSpread?.home?.open?.line || null),
                    homeLinescores,
                    awayLinescores
                  }
                });
              }
            }
          } else {
            const competition = game.competitions?.[0];
            if (!competition) continue;
            const home = competition.competitors.find((c) => c.homeAway === "home");
            const away = competition.competitors.find((c) => c.homeAway === "away");
            if (!home || !away) continue;
            let gameTime = new Date(competition.date).getTime();
            const overUnderRaw = competition.odds?.[0]?.overUnder;
            const overUnder = extractLine(overUnderRaw);
            const spreadRaw = competition.odds?.[0]?.spread ?? competition.odds?.[0]?.pointSpread?.home?.close?.line ?? competition.odds?.[0]?.pointSpread?.home?.open?.line ?? null;
            const spread = extractLine(spreadRaw);
            const network = competition.geoBroadcasts?.[0]?.media?.shortName || "N/A";
            let active = true;
            const mlHome = competition.odds?.[0]?.moneyline?.home?.close?.odds || competition.odds?.[0]?.moneyline?.home?.open?.odds;
            const mlAway = competition.odds?.[0]?.moneyline?.away?.close?.odds || competition.odds?.[0]?.moneyline?.away?.open?.odds;
            let threshold = Math.abs(scraperConfig?.maxMoneylineOdds ?? 300);
            if (scraperConfig?.sportOverrides && scraperConfig.sportOverrides[league] !== void 0) {
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
            let homeScore = parseFloat(home.score !== void 0 && home.score !== null && home.score !== "" ? home.score : "0");
            if (isNaN(homeScore)) homeScore = 0;
            let awayScore = parseFloat(away.score !== void 0 && away.score !== null && away.score !== "" ? away.score : "0");
            if (isNaN(awayScore)) awayScore = 0;
            let rawStatus = competition.status?.type?.name || "STATUS_SCHEDULED";
            let finalStatusDesc = competition.status?.type?.shortDetail || "Upcoming";
            let finalStatus = "STATUS_SCHEDULED";
            if (["FIFA", "LMX", "ARG", "BRA", "EPL", "MLS", "FRA", "TUR", "RPL", "CHN", "NWSL"].includes(league) && (competition.status?.type?.completed === true || competition.status?.type?.name === "STATUS_FINAL" || MATCHUP_FINAL_STATUSES.includes(competition.status?.type?.name || "") || competition.status?.type?.shortDetail?.toLowerCase().includes("final") || competition.status?.type?.detail?.toLowerCase().includes("final"))) {
              let calculatedHomeScore = home.linescores ? home.linescores.filter((ls) => ls.winner === true).length : homeScore;
              let calculatedAwayScore = away.linescores ? away.linescores.filter((ls) => ls.winner === true).length : awayScore;
              if (home.winner === true && calculatedHomeScore <= calculatedAwayScore) {
                homeScore = awayScore + 1;
              } else if (away.winner === true && calculatedAwayScore <= calculatedHomeScore) {
                awayScore = homeScore + 1;
              }
            }
            const descLower = finalStatusDesc.toLowerCase();
            const detailLower = (competition.status?.type?.detail || "").toLowerCase();
            const hasLinescores = home.linescores && home.linescores.length > 0 || away.linescores && away.linescores.length > 0;
            if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes("postponed") || descLower.includes("canceled") || descLower.includes("cancelled") || descLower.includes("abandoned") || detailLower.includes("postponed") || detailLower.includes("canceled") || detailLower.includes("cancelled") || detailLower.includes("abandoned")) {
              finalStatus = "STATUS_POSTPONED";
            } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes("suspended") || detailLower.includes("suspended") || descLower.includes("delayed") || detailLower.includes("delayed")) {
              if (competition.status?.type?.state === "pre") {
                finalStatus = "STATUS_SCHEDULED";
                finalStatusDesc = competition.status?.type?.detail || competition.status?.type?.shortDetail || "Delayed";
                if (gameTime && Date.now() >= gameTime) {
                  gameTime = Date.now() + 30 * 60 * 1e3;
                }
              } else {
                finalStatus = "STATUS_DELAYED";
              }
            } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || competition.status?.type?.completed === true && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || descLower.includes("final") && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus)) {
              finalStatus = "STATUS_FINAL";
            } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || competition.status?.type?.state === "in" || rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0 || hasLinescores || competition.status?.type?.state !== "pre" && competition.status?.period && competition.status?.period > 0) || rawStatus === "STATUS_SCHEDULED" && gameTime && Date.now() >= gameTime) {
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
              } else if (league === "CRICKET" && competition.status?.period) {
                let currentOvers = null;
                for (const competitor of competition.competitors || []) {
                  const battingLinescore = (competitor.linescores || []).find(
                    (ls) => ls.isBatting === true && ls.period === competition.status.period
                  );
                  if (battingLinescore && battingLinescore.overs !== void 0) {
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
              gameId,
              homeTeam: {
                id: String(home.id),
                name: home.team.name || "Home Team",
                image: (league === "CRICKET" ? MLC_LOGOS[String(home.id)] : void 0) || home.team.logo || "/logo.png",
                score: homeScore
              },
              awayTeam: {
                id: String(away.id),
                name: away.team.name || "Away Team",
                image: (league === "CRICKET" ? MLC_LOGOS[String(away.id)] : void 0) || away.team.logo || "/logo.png",
                score: awayScore
              },
              cost: 0,
              metadata: {
                network,
                overUnder,
                spread,
                mlHome: mlHome ? parseInt(mlHome, 10) : null,
                mlAway: mlAway ? parseInt(mlAway, 10) : null,
                homeLinescores: home.linescores || null,
                awayLinescores: away.linescores || null
              }
            });
          }
        }
      }
    } catch (err) {
      console.error(`Endpoint failed: ${endpoint}`, err);
    }
  }
  response.data = parsedMatchups;
  response.gamesOnSchedule = parsedMatchups.length;
  return response;
}
function extractLine(str) {
  if (str === null || str === void 0) return null;
  if (typeof str === "number") str = String(str);
  if (typeof str !== "string") return null;
  if (!str) return null;
  const match = str.match(/([+-]?\d+\.?\d*)/);
  return match ? match[1] : null;
}

// test_scrape_full.ts
async function run() {
  console.log("Scraping MLB...");
  const res = await scrapeLeagueSchedules("MLB");
  console.log("Response data length:", res.data?.length);
  if (res.data && res.data.length > 0) {
    console.log("First game:", new Date(res.data[0].startTime).toLocaleString());
  } else {
    console.log("No games", res.error);
  }
}
run();
