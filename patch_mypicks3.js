import fs from 'fs';
let content = fs.readFileSync('src/pages/mypicks/MyPicksPage.tsx', 'utf8');

const target = `    return () => {
        isMounted = false;
        unsub();
    };
  const currentMonthPicks`;

const replacement = `    return () => {
        isMounted = false;
        unsub();
    };
  }, [picks]);
  const currentMonthPicks`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/mypicks/MyPicksPage.tsx', content);
