const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/matchups/PlayerPropBuilderPage.tsx', 'utf8');

code = code.replace(
    /'NFL': \['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'TOUCHDOWNS', 'ANYTIME_TD', 'INTERCEPTIONS'\],/,
    "'NFL': ['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'TOUCHDOWNS', 'PASSING_TOUCHDOWNS'],"
);

code = code.replace(
    /'CFB': \['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'TOUCHDOWNS', 'ANYTIME_TD', 'INTERCEPTIONS'\],/,
    "'CFB': ['PASSING_YARDS', 'RUSHING_YARDS', 'RECEIVING_YARDS', 'TOUCHDOWNS', 'PASSING_TOUCHDOWNS'],"
);

fs.writeFileSync('src/pages/admin/matchups/PlayerPropBuilderPage.tsx', code);
