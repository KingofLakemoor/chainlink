const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf-8');

const missingElseBlock = `          } else {
                const competition = game.competitions?.[0];
                if (!competition) continue;
                const home = competition.competitors.find((c: any) => c.homeAway === "home");
                const away = competition.competitors.find((c: any) => c.homeAway === "away");
                if (!home || !away) continue;
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
                  finalStatusDesc = currentOvers !== null ? \`Thru \${currentOvers}\` : \`Thru \${competition.status.period}\`;
              }
          } else {
              finalStatus = "STATUS_SCHEDULED";
              finalStatusDesc = "Upcoming";
          }

          parsedMatchups.push({
             startTime: gameTime,
             active,
             featured: false,
             title: \`\${away.team.name} @ \${home.team.name}\`,
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
               mlAway: mlAway ? parseInt(mlAway, 10) : null,
               homeLinescores: home.linescores || null,
               awayLinescores: away.linescores || null
             }
          });
          }`;

const search = `              } // comp
            } // grouping
          } else { // wait, was there an else?! Let's just assume no else, but we need to close game and day and try and endpoint!
            // Actually, wait! Did the original have an else?
            // If the original didn't have an else, then what did the other sports do? They did nothing!
            // Wait, let's just close all the loops properly!
          } // if ATP/WTA`;

if (code.includes(search)) {
    code = code.replace(search, `              } // comp\n            } // grouping\n` + missingElseBlock);
    fs.writeFileSync('src/services/espnScraper.ts', code);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find search string");
}
