const fs = require('fs');
let code = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

code = code.replace(
    /if \(existingData\.metadata\?\.period\) {[\s\S]*?}/,
    `if (summaryData.header?.competitions?.[0]?.status?.period) {
                          const fetchedPeriod = summaryData.header.competitions[0].status.period;
                          const currentPeriod = existingData.metadata?.period || 0;
                          if (fetchedPeriod > currentPeriod) {
                              existingData.metadata = { ...existingData.metadata, period: fetchedPeriod };
                          }
                      }`
);

fs.writeFileSync('src/services/scheduleProcessor.ts', code);
