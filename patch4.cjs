const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

// replace the broken block
code = code.replace(/\} else if \(MATCHUP_DELAYED_STATUSES\.includes\(rawStatus\) \|\| descLower\.includes\('suspended'\) \|\| detailLower\.includes\('suspended'\) \|\| descLower\.includes\('delayed'\) \|\| detailLower\.includes\('delayed'\)\) \{[\s\S]*?finalStatus = "STATUS_DELAYED";\n          \} else if \(MATCHUP_FINAL_STATUSES\.includes\(rawStatus\)/,
`} else if (MATCHUP_DELAYED_STATUSES.includes(rawStatus) || descLower.includes('suspended') || detailLower.includes('suspended') || descLower.includes('delayed') || detailLower.includes('delayed')) {
              if (competition.status?.type?.state === 'pre') {
                  finalStatus = "STATUS_SCHEDULED";
                  finalStatusDesc = competition.status?.type?.detail || competition.status?.type?.shortDetail || "Delayed";
                  if (gameTime && Date.now() >= gameTime) {
                      gameTime = Date.now() + 30 * 60 * 1000;
                  }
              } else {
                  finalStatus = "STATUS_DELAYED";
              }
          } else if (MATCHUP_FINAL_STATUSES.includes(rawStatus)`);

fs.writeFileSync('src/services/espnScraper.ts', code);
