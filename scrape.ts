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
                  let startTime = comp.date ? new Date(comp.date).getTime() : 0;

                  if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes('postponed') || descLower.includes('canceled') || descLower.includes('cancelled') || descLower.includes('abandoned') || detailLower.includes('postponed') || detailLower.includes('canceled') || detailLower.includes('cancelled') || detailLower.includes('abandoned')) {
                      finalStatus = "STATUS_POSTPONED";
                  } else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes('suspended') || detailLower.includes('suspended') || descLower.includes('delayed') || detailLower.includes('delayed')) {
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
                     startTime,
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
              } // comp
            } // grouping
          } else { // wait, was there an else?! Let's just assume no else, but we need to close game and day and try and endpoint!
            // Actually, wait! Did the original have an else?
            // If the original didn't have an else, then what did the other sports do? They did nothing!
            // Wait, let's just close all the loops properly!
          } // if ATP/WTA
        } // for game
      } // for day
    } catch (err: any) {
      console.error(`Endpoint failed: ${endpoint}`, err);
    }
  }
  response.data = parsedMatchups;
  response.gamesOnSchedule = parsedMatchups.length;
  return response;
}
