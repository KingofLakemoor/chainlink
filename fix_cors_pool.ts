import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/link4/Link4SegmentDetail.tsx', 'utf-8');
code = code.replace("const res = await scrapeLeagueSchedules(lg, false);", "const res = await scrapeLeagueSchedules(lg, false, undefined, undefined);");
fs.writeFileSync('src/pages/admin/link4/Link4SegmentDetail.tsx', code);
