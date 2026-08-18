const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `      setCampaign(prev => ({ ...prev, currentWeek: selectedWeek, totalWeeks, theme: { primaryColor: themePrimaryColor, title: themeTitle, subtitle: themeSubtitle, logoUrl: finalLogoUrl } }));`;

const repl = `      const updatedWeekSettings = {
        ...(campaign.weekSettings || {}),
        [selectedWeek]: {
          gamesBeginDate: weekGamesBeginDateStr ? new Date(weekGamesBeginDateStr).getTime() : null,
          endDate: weekEndDateStr ? new Date(weekEndDateStr).getTime() : null
        }
      };
      
      setCampaign(prev => ({ 
        ...prev, 
        currentWeek: selectedWeek, 
        totalWeeks, 
        visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() || prev.visibleDate || Date.now() : prev.visibleDate || Date.now(),
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() || prev.gamesBeginDate || Date.now() : prev.gamesBeginDate || Date.now(),
        startDate: visibleDateStr ? new Date(visibleDateStr).getTime() || prev.visibleDate || Date.now() : prev.visibleDate || Date.now(),
        endDate: endDateStr ? new Date(endDateStr).getTime() || prev.endDate || Date.now() : prev.endDate || Date.now(),
        weekSettings: updatedWeekSettings,
        theme: { primaryColor: themePrimaryColor, title: themeTitle, subtitle: themeSubtitle, logoUrl: finalLogoUrl } 
      }));`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched local campaign state update!");
} else {
  console.log("Could not find target in PickEmCampaignDetail.");
}
