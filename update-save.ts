import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

const oldUpdateStart = `  const updateCurrentWeek = async () => {
    if (!campaign || !id) return;
    try {
    let finalLogoUrl = themeLogoUrl;`;

const newUpdateStart = `  const handleSaveCampaign = async () => {
    if (!campaign || !id) return;
    try {
    let finalLogoUrl = themeLogoUrl;`;

content = content.replace(oldUpdateStart, newUpdateStart);

const oldUpdateDoc = `      await updateDoc(doc(db, 'pickemCampaigns', id), {
        currentWeek: selectedWeek,
        totalWeeks: totalWeeks,
        visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() : null,
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() : null,
        startDate: startDateStr ? new Date(startDateStr).getTime() : null,
        endDate: endDateStr ? new Date(endDateStr).getTime() : null,
      weekSettings: {
        ...(campaign.weekSettings || {}),
        [selectedWeek]: {
          label: weekLabel,
          gamesBeginDate: weekGamesBeginDateStr ? new Date(weekGamesBeginDateStr).getTime() : null,
          endDate: weekEndDateStr ? new Date(weekEndDateStr).getTime() : null
        }
      },
      theme: {
        primaryColor: themePrimaryColor,
        title: themeTitle,
        subtitle: themeSubtitle,
        logoUrl: finalLogoUrl,
      }
      });`;

const newUpdateDoc = `      await updateDoc(doc(db, 'pickemCampaigns', id), {
        currentWeek: selectedWeek,
        totalWeeks: totalWeeks,
        useTiebreaker,
        isPrivate,
        joinCode: joinCode.trim(),
        visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() : null,
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() : null,
        startDate: startDateStr ? new Date(startDateStr).getTime() : null,
        endDate: endDateStr ? new Date(endDateStr).getTime() : null,
      weekSettings: {
        ...(campaign.weekSettings || {}),
        [selectedWeek]: {
          label: weekLabel,
          gamesBeginDate: weekGamesBeginDateStr ? new Date(weekGamesBeginDateStr).getTime() : null,
          endDate: weekEndDateStr ? new Date(weekEndDateStr).getTime() : null
        }
      },
      theme: {
        primaryColor: themePrimaryColor,
        title: themeTitle,
        subtitle: themeSubtitle,
        logoUrl: finalLogoUrl,
      }
      });`;

content = content.replace(oldUpdateDoc, newUpdateDoc);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
