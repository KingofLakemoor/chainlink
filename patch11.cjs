const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const endRegex = /homeLinescores: home\.linescores \|\| null,\s+awayLinescores: away\.linescores \|\| null\s+\}\s+\}\);\s+\}\s+\}\s+\} catch \([\s\S]*$/;

const goodEndMatchups = `              homeLinescores: home.linescores || null,
               awayLinescores: away.linescores || null
             }
          });
        }
      }
      return parsedMatchups;
    } catch (e) {
        console.error("Error scraping scoreboard endpoint for league", league, e);
        return [];
    }
}`;

if (code.match(endRegex)) {
    code = code.replace(endRegex, goodEndMatchups);
    console.log("REPLACED!");
} else {
    console.log("NOT FOUND!");
}
fs.writeFileSync('src/services/espnScraper.ts', code);
