const fs = require('fs');
let code = fs.readFileSync('src/services/pickemGrader.ts', 'utf8');
code = code.replace("pointsEarned = 1; // Assuming 1 point per correct pick", "pointsEarned = pickData.confidence || 1; // Handle confidence points");

code = code.replace("transaction.update(pickDoc.ref, {", `transaction.update(pickDoc.ref, {`); // We also need to eliminate users if survivor

fs.writeFileSync('src/services/pickemGrader.ts', code);
