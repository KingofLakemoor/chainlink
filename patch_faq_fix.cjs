const fs = require('fs');
let code = fs.readFileSync('src/pages/help/HelpPage.tsx', 'utf8');

code = code.replace(
    /<div className="space-y-2">\s*<h3 className="font-bold text-white text-lg">Do passing touchdowns count for "Anytime TD" props\?<\/h3>\s*<p>No\. An "Anytime Touchdown" prop does not include passing touchdowns, as the selected player must physically cross the goal line or catch the ball in the end zone to score\. For quarterbacks throwing a touchdown pass, we offer a completely separate prop specifically labeled as passing touchdowns\.<\/p>\s*<\/div>\s*<div className="space-y-2">\s*<h3 className="font-bold text-white text-lg">What happens if a game is canceled or postponed\?<\/h3>/,
    `<h3 className="font-bold text-white text-lg">What happens if a game is canceled or postponed?</h3>`
);

fs.writeFileSync('src/pages/help/HelpPage.tsx', code);
