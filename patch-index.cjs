const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const oldStr = `        var reloaded = sessionStorage.getItem('chunk_error_reloaded_html');
        if (!reloaded) {
          sessionStorage.setItem('chunk_error_reloaded_html', 'true');
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for (var i = 0; i < registrations.length; i++) {
                registrations[i].unregister();
              }
              window.location.reload();
            }).catch(function() {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }`;

const newStr = `        var reloaded = sessionStorage.getItem('chunk_error_reloaded_html');
        if (!reloaded) {
          sessionStorage.setItem('chunk_error_reloaded_html', 'true');
          var doReload = function() {
            var url = new URL(window.location.href);
            url.searchParams.set('nocache', new Date().getTime());
            window.location.href = url.toString();
          };
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for (var i = 0; i < registrations.length; i++) {
                registrations[i].unregister();
              }
              doReload();
            }).catch(doReload);
          } else {
            doReload();
          }
        }`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('index.html', content);
