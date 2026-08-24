const fs = require('fs');
let code = fs.readFileSync('src/services/autoSync.ts', 'utf8');

code = code.replace("let syncInterval: NodeJS.Timeout | null = null;", "let syncInterval: NodeJS.Timeout | null = null;\nlet loopCount = 0;");

code = code.replace("const runSync = async () => {\n    try {", "const runSync = async () => {\n    const isFullSync = loopCount % 5 === 0;\n    loopCount++;\n    try {");

code = code.replace("const bracketMatchIds = new Set();", "const bracketMatchIds = new Set<string>();");
code = code.replace("const pickemMatchupIds = new Set();", "const pickemMatchupIds = new Set<string>();");

fs.writeFileSync('src/services/autoSync.ts', code);
