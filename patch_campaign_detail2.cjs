const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetDropdown = `                {[...Array(totalWeeks)].map((_, i) => (
                  <option key={i+1} value={i+1}>Week {i+1}</option>
                ))}
              </select>`;

const replDropdown = `                {[...Array(totalWeeks)].map((_, i) => {
                  const w = i + 1;
                  const lbl = campaign?.weekSettings?.[w]?.label;
                  return (
                    <option key={w} value={w}>{lbl ? \`Week \${w} (\${lbl})\` : \`Week \${w}\`}</option>
                  );
                })}
              </select>`;

code = code.replace(targetDropdown, replDropdown);

const targetH3 = `<h3 className="font-bold text-lg capitalize">Week {selectedWeek} Matchups ({matchups.length})</h3>`;
const replH3 = `<h3 className="font-bold text-lg capitalize">{campaign?.weekSettings?.[selectedWeek]?.label || \`Week \${selectedWeek}\`} Matchups ({matchups.length})</h3>`;
code = code.replace(targetH3, replH3);

fs.writeFileSync(file, code);
console.log("Patched PickEmCampaignDetail.tsx Admin dropdown");
