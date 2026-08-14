const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
const target = `              doReload();
            }).catch(doReload);
          } else {
            doReload();
          }`;
const newCode = `              caches.keys().then(function(names) {
                for (let name of names) caches.delete(name);
                doReload();
              });
            }).catch(doReload);
          } else {
            doReload();
          }`;
code = code.replace(target, newCode);
fs.writeFileSync('index.html', code);
