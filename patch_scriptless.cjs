const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /               active: finalStatus === "STATUS_SCHEDULED",\n               featured: false,\n               title: sm\.name,/g,
  '               active: finalStatus === "STATUS_SCHEDULED",\n               featured: true,\n               featuredType: "yZd7SruYT08dhh6MbVIh",\n               title: sm.name,'
);

fs.writeFileSync(file, code);
