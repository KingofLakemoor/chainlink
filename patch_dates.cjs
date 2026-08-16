const fs = require('fs');
let content = fs.readFileSync('src/services/espnScraper.ts', 'utf8');

const target = `    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const theDayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

    const formatESTDate = (d: Date) => {`;

const replacement = `    const today = new Date();
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const theDayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

    const formatESTDate = (d: Date) => {`;

content = content.replace(target, replacement);

const target2 = `dates = [yesterday, today, tomorrow, theDayAfterTomorrow].map(formatESTDate);`;
const replacement2 = `dates = [twoDaysAgo, yesterday, today, tomorrow, theDayAfterTomorrow].map(formatESTDate);`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/services/espnScraper.ts', content);
