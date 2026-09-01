import * as fs from 'fs';

let rules = fs.readFileSync('firestore.rules', 'utf8');

// Replace the entire match /pickemPicks/{pickId} block
const pickemPicksBlock = `    match /pickemPicks/{pickId} {
      function isMatchupOpen(mId) {
        return mId != null && mId != '' &&
               exists(/databases/$(database)/documents/pickemMatchups/$(mId)) &&
               get(/databases/$(database)/documents/pickemMatchups/$(mId)).data.get('status', 'STATUS_SCHEDULED') == 'STATUS_SCHEDULED' &&
               (
                 get(/databases/$(database)/documents/pickemMatchups/$(mId)).data.get('startTime', 0) == null ||
                 get(/databases/$(database)/documents/pickemMatchups/$(mId)).data.get('startTime', 0) == 0 ||
                 !(get(/databases/$(database)/documents/pickemMatchups/$(mId)).data.get('startTime', 0) is number) ||
                 get(/databases/$(database)/documents/pickemMatchups/$(mId)).data.get('startTime', 0) > request.time.toMillis()
               );
      }
      allow read: if isSignedIn() && (resource == null || resource.data.get('participantId', '') == request.auth.uid || isAdmin());
      allow create: if isSignedIn() 
        && request.resource.data.get('participantId', '') == request.auth.uid 
        && isMatchupOpen(request.resource.data.get('matchupId', '')) 
        && exists(/databases/$(database)/documents/pickemParticipants/$(request.resource.data.get('campaignId', '') + '_' + request.auth.uid));
      allow update: if isSignedIn() && (
        isAdmin() ||
        (
          resource.data.get('participantId', '') == request.auth.uid 
          && request.resource.data.get('participantId', '') == request.auth.uid 
          && isMatchupOpen(request.resource.data.get('matchupId', '')) 
          && exists(/databases/$(database)/documents/pickemParticipants/$(request.resource.data.get('campaignId', '') + '_' + request.auth.uid))
        )
      );
      allow delete: if isSignedIn() && (
        isAdmin() ||
        (
          resource.data.get('participantId', '') == request.auth.uid &&
          isMatchupOpen(resource.data.get('matchupId', ''))
        )
      );
    }`;

rules = rules.replace(/match \/pickemPicks\/\{pickId\} \{[\s\S]*?allow delete: [^;]+;\s*\}/, pickemPicksBlock);

fs.writeFileSync('firestore.rules', rules);
console.log('Rules Patched');
