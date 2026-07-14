const fs = require('fs');

let content = fs.readFileSync('src/pages/shop/ShopPage.tsx', 'utf8');

// First add import if it doesn't exist
if (!content.includes('FirebaseImage')) {
  content = content.replace(
    /import React, \{ useState, useEffect \} from 'react';/,
    `import React, { useState, useEffect } from 'react';\nimport { FirebaseImage } from '../../components/ui/FirebaseImage';`
  );
}

// Then replace <img loading="lazy" ...> with <FirebaseImage ...>
content = content.replace(/<img loading="lazy"\s*src=/g, '<FirebaseImage src=');
content = content.replace(/<img loading="lazy"/g, '<FirebaseImage');

fs.writeFileSync('src/pages/shop/ShopPage.tsx', content);
