const fs = require('fs');

let mainCode = fs.readFileSync('src/main.tsx', 'utf-8');
if (!mainCode.includes('window.confirm =')) {
  mainCode = `
// Override confirm for AI Studio iframe environment
const originalConfirm = window.confirm;
window.confirm = (msg) => {
  if (window.self !== window.top) return true;
  return originalConfirm(msg);
};
` + mainCode;
  fs.writeFileSync('src/main.tsx', mainCode);
}
