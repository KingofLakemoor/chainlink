const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const badCodeRegex = /\} else if \(MATCHUP_DELAYED_STATUSES\.includes\(rawStatus\) \|\| descLower\.includes\('suspended'\) \|\| detailLower\.includes\('suspended'\) \|\| descLower\.includes\('delayed'\) \|\| detailLower\.includes\('delayed'\)\) \{\s*if \(competition\.status\?\.type\?\.state === 'pre'\) \{\s*finalStatus = "STATUS_SCHEDULED";\s*finalStatusDesc = competition\.status\?\.type\?\.detail \|\| competition\.status\?\.type\?\.shortDetail \|\| "Delayed";\s*if \(gameTime && Date\.now\(\) >= gameTime\) \{\s*gameTime = Date\.now\(\) \+ 30 \* 60 \* 1000;\s*\}\s*\} else \{\s*finalStatus = "STATUS_DELAYED";\s*\}\s*\} else if \(MATCHUP_FINAL_STATUSES\.includes\(rawStatus\)/;

let replacement = `} else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes('suspended') || detailLower.includes('suspended') || descLower.includes('delayed') || detailLower.includes('delayed')) {
                      if (compState === 'pre') {
                          finalStatus = "STATUS_SCHEDULED";
                          finalStatusDesc = comp.status?.type?.detail || comp.status?.type?.shortDetail || "Delayed";
                          if (startTime > 0 && Date.now() >= startTime) {
                              startTime = Date.now() + 30 * 60 * 1000;
                          }
                      } else {
                          finalStatus = "STATUS_DELAYED";
                      }
                  } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || (comp.status?.type?.completed === true && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus)) || (descLower.includes('final') && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus))) {
                      finalStatus = "STATUS_FINAL";
                  } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || compState === 'in' || (rawStatus === 'STATUS_SCHEDULED' && (hasLinescores || (compState !== 'pre' && comp.status?.period && comp.status?.period > 0))) || (rawStatus === "STATUS_SCHEDULED" && startTime > 0 && Date.now() >= startTime)) {
                      finalStatus = "STATUS_IN_PROGRESS";
                      if (comp.status?.type?.detail && !comp.status.type.detail.toLowerCase().match(/\\b(am|pm|edt|est|pdt|pst|cst|cdt)\\b/)) {
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
                          finalStatusDesc = currentOvers !== null ? \`Thru \${currentOvers}\` : \`Thru \${comp.status.period}\`;
                      }
                  } else {
                      finalStatus = "STATUS_SCHEDULED";
                      finalStatusDesc = "Upcoming";
                  }
                  const homeLinescores = homeCompetitor.linescores ? homeCompetitor.linescores.map((ls: any) => ls.value || 0) : [];
                  const awayLinescores = awayCompetitor.linescores ? awayCompetitor.linescores.map((ls: any) => ls.value || 0) : [];
                  parsedMatchups.push({
                     startTime,
                     active: true,
                     featured: false,
                     title: \`\${awayName || 'Away'} @ \${homeName || 'Home'}\`,
                     league,
                     type: "MONEYLINE",
                     status: finalStatus,
                     statusDesc: finalStatusDesc,
                     gameId: matchupGameId,
                     homeTeam: {
                         id: String(homeCompetitor.id),
                         name: homeName || "Home Team",
                         image: (league as any === "CRICKET" ? MLC_LOGOS[String(homeCompetitor.id)] : undefined) || homeCompetitor.team?.logo || "/logo.png",
                         score: homeScore
                     },
                     awayTeam: {
                         id: String(awayCompetitor.id),
                         name: awayName || "Away Team",
                         image: (league as any === "CRICKET" ? MLC_LOGOS[String(awayCompetitor.id)] : undefined) || awayCompetitor.team?.logo || "/logo.png",
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
        }
    } catch (e) {
        console.error("Error scraping stats endpoint for league", league, e);
    }
}

export async function fetchMatchups(league: string, scraperConfig?: any) {
    let url = getScoreboardUrl(league);
    if (!url) return [];
    try {
        const response = await fetch(url);
        const data = await response.json();
        const parsedMatchups: any[] = [];
        for (const event of data.events || []) {
            for (const competition of event.competitions || []) {
                const home = competition.competitors.find((c: any) => c.homeAway === "home");
                const away = competition.competitors.find((c: any) => c.homeAway === "away");
                if (!home || !away) continue;
                const gameId = String(competition.id || event.id);
                let gameTime = new Date(competition.date).getTime();
                const overUnderRaw = competition.odds?.[0]?.overUnder;
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
                  const match = details.match(/([+-]?\\d+)/);
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
                if (["FIFA", "LMX", "EPL", "MLS", "FRA", "TUR", "RPL", "CHN", "NWSL"].includes(league as string) && (competition.status?.type?.completed === true || competition.status?.type?.name === "STATUS_FINAL" || MATCHUP_FINAL_STATUSES.includes(competition.status?.type?.name || "") || competition.status?.type?.shortDetail?.toLowerCase().includes("final") || competition.status?.type?.detail?.toLowerCase().includes("final"))) {
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
                    if (competition.status?.type?.state === 'pre') {
                        finalStatus = "STATUS_SCHEDULED";
                        finalStatusDesc = competition.status?.type?.detail || competition.status?.type?.shortDetail || "Delayed";
                        if (gameTime && Date.now() >= gameTime) {
                            gameTime = Date.now() + 30 * 60 * 1000;
                        }
                    } else {
                        finalStatus = "STATUS_DELAYED";
                    }
                } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus)`;

if (code.match(badCodeRegex)) {
    code = code.replace(badCodeRegex, replacement);
    fs.writeFileSync('src/services/espnScraper.ts', code);
    console.log("REPLACED!");
} else {
    console.log("NOT FOUND!");
}
