const fs = require('fs');
const file = 'src/services/propGrader.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /        for \(const doc of snap\.docs\) \{/,
  '        for (const doc of snap.docs) {\n            try {'
);

code = code.replace(
  /            } else if \(m\.startTime && Date\.now\(\) >= m\.startTime && m\.status === 'STATUS_SCHEDULED'\) \{\n                \/\/ If games have started by time but boxscore is not ready, update status to lock the prop\n                batch\.update\(doc\.ref, \{ status: 'STATUS_IN_PROGRESS' \}\);\n                count\+\+;\n            \}\n        \}/,
  "            } else if (m.startTime && Date.now() >= m.startTime && m.status === 'STATUS_SCHEDULED') {\n                // If games have started by time but boxscore is not ready, update status to lock the prop\n                batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS' });\n                count++;\n            }\n            } catch (err) {\n                console.error('Error processing prop matchup ' + doc.id, err);\n            }\n        }"
);

fs.writeFileSync(file, code);
