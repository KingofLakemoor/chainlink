const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

// The end of fetchMatchupStats / scrapeLeagueSchedules is currently:
//    } catch (e) {
//        console.error("Error scraping stats endpoint for league", league, e);
//    }
//  } // for endpoint
//  return parsedMatchups;
//}
// We need to restore it to returning 'response'

code = code.replace(
`    } catch (e) {
        console.error("Error scraping stats endpoint for league", league, e);
    }
  } // for endpoint
  return parsedMatchups;
}`,
`    } catch (err: any) {
      console.error(\`Endpoint failed: \${endpoint}\`, err);
    }
  }
  response.data = parsedMatchups;
  response.gamesOnSchedule = parsedMatchups.length;
  return response;
}`
);

// The end of fetchMatchups is currently the old end of scrapeLeagueSchedules!
const badEndMatchups = `          });
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

const goodEndMatchups = `          });
        }
      }
      return parsedMatchups;
    } catch (e) {
        console.error("Error scraping scoreboard endpoint for league", league, e);
        return [];
    }
}`;

if (code.includes(badEndMatchups)) {
    code = code.replace(badEndMatchups, goodEndMatchups);
    console.log("Replaced end of fetchMatchups");
}

fs.writeFileSync('src/services/espnScraper.ts', code);
