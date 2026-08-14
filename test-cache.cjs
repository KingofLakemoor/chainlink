const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        var url = new URL(window.location.href);
        url.searchParams.set('nocache', new Date().getTime());
        window.location.href = url.toString();
      });`;

const newCode = `      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        caches.keys().then(function(names) {
            for (let name of names) caches.delete(name);
            var url = new URL(window.location.href);
            url.searchParams.set('nocache', new Date().getTime());
            window.location.href = url.toString();
        });
      });`;

code = code.replace(target, newCode);
fs.writeFileSync('index.html', code);

let mainCode = fs.readFileSync('src/main.tsx', 'utf8');
const mainTarget = `  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.update();
    }
  });`;
const newMainCode = `  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.update();
    }
  });
  
  // Hard cache clear if we detect the query param
  if (window.location.search.includes('nocache')) {
    caches.keys().then(function(names) {
      for (let name of names) caches.delete(name);
    });
  }`;
mainCode = mainCode.replace(mainTarget, newMainCode);
fs.writeFileSync('src/main.tsx', mainCode);

