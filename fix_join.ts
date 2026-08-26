import fs from 'fs';

// PickEmLandingPage.tsx
let content = fs.readFileSync('src/pages/pickem/PickEmLandingPage.tsx', 'utf-8');
content = content.replace(
  "let targetCampaignId = campaigns.find(c => c.isPrivate && c.joinCode && c.joinCode.trim().toLowerCase() === cleanCode.toLowerCase())?.id;",
  "let targetCampaignId = campaigns.find(c => c.joinCode && c.joinCode.trim().toLowerCase() === cleanCode.toLowerCase())?.id;"
);
content = content.replace(
  "return !data.isArchived && data.isPrivate && data.joinCode && data.joinCode.trim().toLowerCase() === cleanCode.toLowerCase();",
  "return !data.isArchived && data.joinCode && data.joinCode.trim().toLowerCase() === cleanCode.toLowerCase();"
);
fs.writeFileSync('src/pages/pickem/PickEmLandingPage.tsx', content);

// apiRouter.ts
let apiContent = fs.readFileSync('src/apiRouter.ts', 'utf-8');
apiContent = apiContent.replace(
  ".where('isPrivate', '==', true)",
  ""
);
fs.writeFileSync('src/apiRouter.ts', apiContent);
