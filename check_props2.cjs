const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walk(dirFile, filelist) : filelist.concat(dirFile);
    } catch(e) {}
  });
  return filelist;
}

const files = walk('src');

files.forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('...props')) {
      if (content.includes('isStatic')) {
         if (!content.includes('isStatic =') && !content.includes('{ isStatic }') && !content.includes('{isStatic}') && !content.match(/isStatic\s*:/)) {
           console.log("MAYBE:", file);
         }
      }
    }
  }
});
