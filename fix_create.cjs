const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf8');

code = code.replace("const [defaultMatchType,\n      format, setDefaultMatchType]", "const [defaultMatchType, setDefaultMatchType]");

code = code.replace("const [defaultMatchType,\n        format, setDefaultMatchType]", "const [defaultMatchType, setDefaultMatchType]");

fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', code);
