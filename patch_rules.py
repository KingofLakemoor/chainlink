import re

with open('firestore.rules', 'r') as f:
    content = f.read()

old_rules = """    match /pickemPicks/{pickId} {
      allow read: if isSignedIn() && (resource == null || existing().participantId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && incoming().participantId == request.auth.uid;
      allow update: if isSignedIn() && existing().participantId == request.auth.uid && incoming().participantId == request.auth.uid;
      allow delete: if isSignedIn() && existing().participantId == request.auth.uid;
    }"""

new_rules = """    match /pickemPicks/{pickId} {
      allow read: if isSignedIn() && (resource == null || existing().participantId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && incoming().participantId == request.auth.uid &&
          get(/databases/$(database)/documents/pickemMatchups/$(incoming().matchupId)).data.startTime > request.time.toMillis();
      allow update: if isSignedIn() && existing().participantId == request.auth.uid && incoming().participantId == request.auth.uid &&
          get(/databases/$(database)/documents/pickemMatchups/$(existing().matchupId)).data.startTime > request.time.toMillis();
      allow delete: if isSignedIn() && existing().participantId == request.auth.uid &&
          get(/databases/$(database)/documents/pickemMatchups/$(existing().matchupId)).data.startTime > request.time.toMillis();
    }"""

if old_rules in content:
    content = content.replace(old_rules, new_rules)
    with open('firestore.rules', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find the old rules snippet")
