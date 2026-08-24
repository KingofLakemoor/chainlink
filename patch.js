const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');
code = code.replace(`                  } else {
                      awayCompetitor = a;
                      homeCompetitor = b;
                  }`, `                  } else {
                      if (league === 'LLWS' || league === 'NWSL') {
                          awayCompetitor = b;
                          homeCompetitor = a;
                      } else {
                          awayCompetitor = a;
                          homeCompetitor = b;
                      }
                  }`);
fs.writeFileSync('src/services/espnScraper.ts', code);
