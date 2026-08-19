const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const target2 = `         visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() || prev.visibleDate || Date.now() : prev.visibleDate || Date.now(),
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() || prev.gamesBeginDate || Date.now() : prev.gamesBeginDate || Date.now(),
        startDate: visibleDateStr ? new Date(visibleDateStr).getTime() || prev.visibleDate || Date.now() : prev.visibleDate || Date.now(),
        endDate: endDateStr ? new Date(endDateStr).getTime() || prev.endDate || Date.now() : prev.endDate || Date.now(),`;

const repl2 = `         visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() : null,
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() : null,
        startDate: startDateStr ? new Date(startDateStr).getTime() : null,
        endDate: endDateStr ? new Date(endDateStr).getTime() : null,`;

if (code.includes(target2)) {
    code = code.replace(target2, repl2);
    console.log("Replaced 2");
}

fs.writeFileSync(file, code);
