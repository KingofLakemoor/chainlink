import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/prize/PrizeAdminPage.tsx', 'utf8');

const targetWinCondition = `<option value="Most Referrals">Most Referrals</option>`;
const replacementWinCondition = `<option value="Referrals">Referrals</option>`;
content = content.replace(targetWinCondition, replacementWinCondition);

fs.writeFileSync('src/pages/admin/prize/PrizeAdminPage.tsx', content);
console.log("Patched admin page 2");
