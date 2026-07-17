const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

// remove imports from the middle of the file
code = code.replace("import * as firebaseAdmin from '../lib/firebase-admin.js';\nimport { gradeMatchups } from './grader.js';", "");

// add them to the top of the file
code = "import * as firebaseAdmin from '../lib/firebase-admin.js';\nimport { gradeMatchups } from './grader.js';\n" + code;

fs.writeFileSync('src/services/propGrader.ts', code);
