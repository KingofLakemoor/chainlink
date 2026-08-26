import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

const targetSave = `      theme: {
        primaryColor: themePrimaryColor,
        title: themeTitle,
        subtitle: themeSubtitle,
        logoUrl: finalLogoUrl,
      }
      });`;
      
const replaceSave = `      theme: {
        primaryColor: themePrimaryColor,
        title: themeTitle,
        subtitle: themeSubtitle,
        logoUrl: finalLogoUrl,
      }
      });
      alert('Campaign settings saved successfully!');`;
      
content = content.replace(targetSave, replaceSave);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
