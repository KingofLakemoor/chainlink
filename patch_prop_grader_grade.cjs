const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

if (!code.includes('import { gradeMatchups }')) {
  code = code.replace("import * as firebaseAdmin from '../lib/firebase-admin.js';", "import * as firebaseAdmin from '../lib/firebase-admin.js';\nimport { gradeMatchups } from './grader.js';");
}

if (!code.includes('const matchupsToGrade: any[] = [];')) {
  code = code.replace("let count = 0;", "let count = 0;\n        const matchupsToGrade: any[] = [];");
  
  code = code.replace(
    "count++;\n            }",
    "count++;\n                if (newStatus === 'STATUS_FINAL') {\n                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', homeTeam: { ...m.homeTeam, score: valueB }, awayTeam: { ...m.awayTeam, score: valueA } });\n                }\n            }"
  );
  
  code = code.replace(
    "if (count > 0) {\n            await batch.commit();\n            console.log(`[propGrader] Updated ${count} prop matchups.`);\n        }",
    "if (count > 0) {\n            await batch.commit();\n            console.log(`[propGrader] Updated ${count} prop matchups.`);\n            if (matchupsToGrade.length > 0) {\n                await gradeMatchups(matchupsToGrade);\n            }\n        }"
  );
}

fs.writeFileSync('src/services/propGrader.ts', code);
