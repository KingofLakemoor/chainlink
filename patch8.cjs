const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

// The incorrect end of fetchMatchups
const badEnd = `          });
        }
      }
    } catch (err: any) {
      console.error(\`Endpoint failed: \${endpoint}\`, err);
    }
  }
  response.data = parsedMatchups;
  response.gamesOnSchedule = parsedMatchups.length;
  return response;
}`;

// The correct end of fetchMatchups
const goodEnd = `          });
        }
      }
      return parsedMatchups;
    } catch (e) {
        console.error("Error scraping scoreboard endpoint for league", league, e);
        return [];
    }
}`;

if (code.includes(badEnd)) {
    code = code.replace(badEnd, goodEnd);
    fs.writeFileSync('src/services/espnScraper.ts', code);
    console.log("REPLACED END OF FETCHMATCHUPS!");
} else {
    console.log("NOT FOUND!");
}
