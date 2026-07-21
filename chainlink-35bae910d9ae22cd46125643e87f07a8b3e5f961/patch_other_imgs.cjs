const fs = require('fs');

function replaceImg(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  if (!content.includes('FirebaseImage')) {
    content = content.replace(
      /import React([\s\S]*?)from 'react';/,
      `import React$1from 'react';\nimport { FirebaseImage } from '../../components/ui/FirebaseImage';`
    );
  }

  // <img src={...}
  content = content.replace(/<img\s+src=/g, '<FirebaseImage src=');
  content = content.replace(/<img\s+loading="lazy"\s+src=/g, '<FirebaseImage src=');
  // for alt="..."
  content = content.replace(/<img(.*?)>/g, '<FirebaseImage$1>');

  fs.writeFileSync(filepath, content);
}

replaceImg('src/pages/dashboard/DashboardPage.tsx');
replaceImg('src/pages/profile/ProfilePage.tsx');
replaceImg('src/pages/leaderboards/LeaderboardsPage.tsx');
