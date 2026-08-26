const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf-8');
content = content.replace(
  'match /link4Segments/{segmentId} { allow read: if true; allow write: if isAdmin(); }',
  'match /link4Segments/{segmentId} { allow read: if true; allow write: if isAdmin(); }\n    match /link4Matchups/{matchupId} { allow read: if isSignedIn(); allow write: if isAdmin(); }'
);
fs.writeFileSync('firestore.rules', content);
