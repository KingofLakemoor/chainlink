import * as fs from 'fs';

let rules = fs.readFileSync('firestore.rules', 'utf8');
rules = rules.replace(
  /incoming\(\)\.get\('participantId',\s*''\)\s*==\s*request\.auth\.uid\s*&&\s*isMatchupOpen\(existing\(\)\s*!=\s*null\s*\?\s*existing\(\)\.get\('matchupId',\s*incoming\(\)\.get\('matchupId',\s*''\)\)\s*:\s*incoming\(\)\.get\('matchupId',\s*''\)\)/g,
  "incoming().get('participantId', '') == request.auth.uid && isMatchupOpen(existing() != null ? existing().get('matchupId', incoming().get('matchupId', '')) : incoming().get('matchupId', '')) && exists(/databases/$(database)/documents/pickemParticipants/$(incoming().get('campaignId', existing() != null ? existing().get('campaignId', '') : '') + '_' + request.auth.uid))"
);
fs.writeFileSync('firestore.rules', rules);
