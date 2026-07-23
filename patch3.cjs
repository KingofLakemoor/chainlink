const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

// The exact string to replace in the second block:
let target = `          if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes('postponed') || descLower.includes('canceled') || descLower.includes('cancelled') || descLower.includes('abandoned') || detailLower.includes('postponed') || detailLower.includes('canceled') || detailLower.includes('cancelled') || detailLower.includes('abandoned')) {
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
              finalStatus = "STATUS_DELAYED";
          } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus) || (competition.status?.type?.completed === true && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus)) || (descLower.includes('final') && !MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus))) {
              finalStatus = "STATUS_FINAL";
          } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || competition.status?.type?.state === 'in' || (rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0 || hasLinescores || (competition.status?.type?.state !== 'pre' && competition.status?.period && competition.status?.period > 0))) || (rawStatus === "STATUS_SCHEDULED" && startTime > 0 && Date.now() >= startTime)) {`;

let replacement = `          if (MATCHUP_POSTPONED_STATUSES.includes(rawStatus) || descLower.includes('postponed') || descLower.includes('canceled') || descLower.includes('cancelled') || descLower.includes('abandoned') || detailLower.includes('postponed') || detailLower.includes('canceled') || detailLower.includes('cancelled') || detailLower.includes('abandoned')) {
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
          } else if (MATCHUP_IN_PROGRESS_STATUSES.includes(rawStatus) || competition.status?.type?.state === 'in' || (rawStatus === "STATUS_SCHEDULED" && (homeScore > 0 || awayScore > 0 || hasLinescores || (competition.status?.type?.state !== 'pre' && competition.status?.period && competition.status?.period > 0))) || (rawStatus === "STATUS_SCHEDULED" && gameTime && Date.now() >= gameTime)) {`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/services/espnScraper.ts', code);
    console.log("REPLACED!");
} else {
    console.log("TARGET NOT FOUND");
}
