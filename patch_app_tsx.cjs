const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `          const startToCheck = c.visibleDate || c.startDate;
          if (!startToCheck || !c.endDate) active = true; // Legacy
          else if (now >= startToCheck && now <= c.endDate) active = true;`;

const repl = `          if (c.isArchived) return; // Skip archived campaigns
          const startToCheck = c.visibleDate || c.startDate;
          if (!startToCheck || !c.endDate) active = true; // Legacy
          else if (now >= startToCheck && now <= c.endDate) active = true;`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched App.tsx!");
} else {
  console.log("Could not find target in App.tsx.");
}
