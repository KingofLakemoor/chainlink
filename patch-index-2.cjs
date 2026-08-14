const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const oldStr = `      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });`;

const newStr = `      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        var url = new URL(window.location.href);
        url.searchParams.set('nocache', new Date().getTime());
        window.location.href = url.toString();
      });`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('index.html', content);
