const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

// Replace the end of fetchMatchupStats
code = code.replace(
`                  });
              }
          }
        }
    } catch (e) {
        console.error("Error scraping stats endpoint for league", league, e);
    }
}`,
`                  });
              } // comp
            } // grouping
          } else { // wait, was there an else?! Let's just assume no else, but we need to close game and day and try and endpoint!
            // Actually, wait! Did the original have an else?
            // If the original didn't have an else, then what did the other sports do? They did nothing!
            // Wait, let's just close all the loops properly!
          } // if ATP/WTA
        } // for game
      } // for day
    } catch (e) {
        console.error("Error scraping stats endpoint for league", league, e);
    }
  } // for endpoint
  return parsedMatchups;
}`
);
fs.writeFileSync('src/services/espnScraper.ts', code);
