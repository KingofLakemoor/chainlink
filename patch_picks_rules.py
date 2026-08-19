import re

with open('firestore.rules', 'r') as f:
    content = f.read()

old_rules = """    match /picks/{pickId} {
      function isValidPick(data) {
        return data.keys().hasAll(['userId', 'matchupId', 'pickId', 'status', 'active', 'createdAt', 'updatedAt']) &&
               data.userId is string && data.matchupId is string &&
               data.status in ['PENDING', 'WIN', 'LOSS', 'PUSH'] &&
               data.active is bool;
      }
      
      allow read: if isSignedIn();
      allow create: if (
        isSignedIn() && isValidPick(incoming()) &&
          incoming().userId == request.auth.uid &&
        exists(/databases/$(database)/documents/matchups/$(incoming().matchupId))
      );
                          
      allow update: if (
        isSignedIn() && isValidPick(incoming()) && (
          isAdmin() ||
          (
            request.auth.uid == existing().userId &&
            incoming().diff(existing()).affectedKeys().hasOnly(['pick', 'active', 'updatedAt']) &&
            existing().status == 'PENDING'
          )
        )
      );
    }"""

new_rules = """    match /picks/{pickId} {
      function isValidPick(data) {
        return data.keys().hasAll(['userId', 'matchupId', 'pickId', 'status', 'active', 'createdAt', 'updatedAt']) &&
               data.userId is string && data.matchupId is string &&
               data.status in ['PENDING', 'WIN', 'LOSS', 'PUSH'] &&
               data.active is bool &&
               (!data.keys().hasAny(['pick']) || data.pick is map || data.pick is string) &&
               (!data.keys().hasAny(['links']) || (data.links is number && data.links >= 0)) &&
               (!data.keys().hasAny(['wager']) || (data.wager is number && data.wager >= 0));
      }
      
      allow read: if isSignedIn();
      allow create: if (
        isSignedIn() && isValidPick(incoming()) &&
        incoming().userId == request.auth.uid &&
        exists(/databases/$(database)/documents/matchups/$(incoming().matchupId)) &&
        get(/databases/$(database)/documents/matchups/$(incoming().matchupId)).data.startTime > request.time.toMillis() &&
        incoming().createdAt >= request.time.toMillis() - 300000 &&
        incoming().createdAt <= request.time.toMillis() + 300000
      );
                          
      allow update: if (
        isSignedIn() && isValidPick(incoming()) && (
          isAdmin() ||
          (
            request.auth.uid == existing().userId &&
            incoming().diff(existing()).affectedKeys().hasOnly(['pick', 'active', 'updatedAt']) &&
            existing().status == 'PENDING' &&
            get(/databases/$(database)/documents/matchups/$(existing().matchupId)).data.startTime > request.time.toMillis()
          )
        )
      );
      
      allow delete: if (
        isSignedIn() && (
          isAdmin() ||
          (
            request.auth.uid == existing().userId &&
            get(/databases/$(database)/documents/matchups/$(existing().matchupId)).data.startTime > request.time.toMillis()
          )
        )
      );
    }"""

if old_rules in content:
    content = content.replace(old_rules, new_rules)
    with open('firestore.rules', 'w') as f:
        f.write(content)
    print("Patched picks rules successfully")
else:
    print("Could not find the old picks rules snippet")

