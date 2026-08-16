const fs = require('fs');
const path = './src/services/propGrader.ts';
let content = fs.readFileSync(path, 'utf8');

const target1 = `                    if (m.metadata.optionA.gameId === m.metadata.optionB.gameId) {`;
const replace1 = `                    if (!m.metadata.optionB || m.metadata.optionA.gameId === m.metadata.optionB.gameId) {`;

content = content.replace(target1, replace1);

const target2 = `                if (m.metadata.isSinglePlayerProp && m.type === 'OVER_UNDER') {`;
const replace2 = `                if ((m.metadata.isSinglePlayerProp || m.metadata.isSoloProp) && (m.type === 'OVER_UNDER' || m.metadata.isYesOnly)) {`;

content = content.replace(target2, replace2);

const target3 = `                     const ou = m.metadata.overUnder || 0;`;
const replace3 = `                     const ou = m.metadata.overUnder || m.metadata.targetLine || 0;`;

content = content.replace(target3, replace3);

fs.writeFileSync(path, content);
