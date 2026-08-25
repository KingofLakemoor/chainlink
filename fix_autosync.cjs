const fs = require('fs');
let code = fs.readFileSync('src/services/autoSync.ts', 'utf8');

const injectPoint = "const bracketMatchIds = new Set<string>();";
const toInject = `      // ALWAYS sync leagues that have games currently in progress, to ensure they don't get stuck forever if a league is deactivated
      try {
          const inProgressSnap = await adminDb.collection('matchups').where('status', '==', 'STATUS_IN_PROGRESS').get();
          inProgressSnap.docs.forEach(doc => {
              if (doc.data().league) activeLeaguesSet.add(doc.data().league);
          });
      } catch (e) {}

      `;

if (code.includes(injectPoint) && !code.includes("ALWAYS sync leagues")) {
    code = code.replace(injectPoint, toInject + injectPoint);
    fs.writeFileSync('src/services/autoSync.ts', code);
    console.log("Injected inProgress check!");
} else {
    console.log("Could not inject.");
}
