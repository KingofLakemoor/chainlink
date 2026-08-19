const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `        const effectiveBeginDate = ws.gamesBeginDate || campaign.gamesBeginDate;
        const effectiveEndDate = ws.endDate || campaign.endDate;
        let specificDates: string[] | undefined = undefined;

        if (effectiveBeginDate && effectiveEndDate) {
           specificDates = [];
           let curr = new Date(effectiveBeginDate);
           const end = new Date(effectiveEndDate);
           while (curr <= end) {
              const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
              const [month, day, year] = str.split("/");
              specificDates.push(\`\${year}\${month}\${day}\`);
              curr = new Date(curr.getTime() + 86400000);
           }
        }`;

const replStr = `        let effectiveBeginDate = ws.gamesBeginDate || campaign.gamesBeginDate;
        let effectiveEndDate = ws.endDate || campaign.endDate;

        // Smart defaults: if only one boundary is provided, construct a 14-day window
        if (effectiveBeginDate && !effectiveEndDate) {
            effectiveEndDate = effectiveBeginDate + (14 * 86400000);
        } else if (!effectiveBeginDate && effectiveEndDate) {
            effectiveBeginDate = effectiveEndDate - (14 * 86400000);
        }

        let specificDates: string[] | undefined = undefined;

        if (effectiveBeginDate && effectiveEndDate) {
           specificDates = [];
           let curr = new Date(effectiveBeginDate);
           const end = new Date(effectiveEndDate);
           let days = 0;
           // Cap at 35 days (5 weeks) to avoid massive ESPN API requests
           while (curr <= end && days <= 35) {
              const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
              const [month, day, year] = str.split("/");
              specificDates.push(\`\${year}\${month}\${day}\`);
              curr = new Date(curr.getTime() + 86400000);
              days++;
           }
        }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replStr);
    fs.writeFileSync(file, code);
    console.log("Patched specificDates logic successfully");
} else {
    console.log("Could not find the target code to patch");
}
