const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf8');
code = code.replace(
    /if \(compState === 'pre'\) \{[\s\S]*?finalStatus = "STATUS_DELAYED";\n\s+\}\n\s+finalStatus = "STATUS_DELAYED";/m,
    `if (compState === 'pre') {
                          finalStatus = "STATUS_SCHEDULED";
                          finalStatusDesc = comp.status?.type?.detail || comp.status?.type?.shortDetail || "Delayed";
                          if (startTime > 0 && Date.now() >= startTime) {
                              startTime = Date.now() + 30 * 60 * 1000;
                          }
                      } else {
                          finalStatus = "STATUS_DELAYED";
                      }`
);
fs.writeFileSync('src/services/espnScraper.ts', code);
