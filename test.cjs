const fs = require('fs');
let code = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const targetStr = `      if (matchupsToGrade.length > 0) {
        await gradeMatchups(matchupsToGrade);`;

if (code.includes(targetStr)) {
  console.log('Target string found!');
} else {
  console.log('Target string NOT found!');
}
