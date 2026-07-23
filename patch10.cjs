const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const regex = /          \}\);\n        \}\n      \}\n    \} catch \(err: any\) \{\n      console\.error\(\`Endpoint failed: \$\{endpoint\}\`, err\);\n    \}\n  \}\n  response\.data = parsedMatchups;\n  response\.gamesOnSchedule = parsedMatchups\.length;\n  return response;\n\}/;

const goodEndMatchups = `          });
        }
      }
      return parsedMatchups;
    } catch (e) {
        console.error("Error scraping scoreboard endpoint", e);
        return [];
    }
}`;

if (code.match(regex)) {
    code = code.replace(regex, goodEndMatchups);
    console.log("REPLACED!");
} else {
    console.log("NOT FOUND!");
}
fs.writeFileSync('src/services/espnScraper.ts', code);
