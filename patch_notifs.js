import fs from 'fs';
let content = fs.readFileSync('src/services/notificationProcessor.ts', 'utf8');

const oldGlobal = `    } else if (audience === 'GLOBAL') {
      const usersSnap = await adminDb!.collection('users').where('fcmTokens', '!=', []).get();
      usersSnap.forEach(u => {
        const tokens = u.data().fcmTokens;
        if (Array.isArray(tokens)) {
          targetTokens.push(...tokens);
        }
      });
    }`;

const newGlobal = `    } else if (audience === 'GLOBAL') {
      // Use pagination to avoid downloading the entire user database into memory simultaneously
      let lastDoc: any = null;
      let hasMore = true;
      
      while (hasMore) {
        let q = adminDb!.collection('users').orderBy('__name__').limit(500);
        if (lastDoc) {
          q = q.startAfter(lastDoc);
        }
        
        const usersSnap = await q.get();
        if (usersSnap.empty) {
          hasMore = false;
          break;
        }
        
        lastDoc = usersSnap.docs[usersSnap.docs.length - 1];
        
        usersSnap.docs.forEach(u => {
          const tokens = u.data().fcmTokens;
          if (Array.isArray(tokens) && tokens.length > 0) {
            targetTokens.push(...tokens);
          }
        });
      }
    }`;

if (content.includes("where('fcmTokens', '!='")) {
    content = content.replace(oldGlobal, newGlobal);
    fs.writeFileSync('src/services/notificationProcessor.ts', content);
    console.log("Patched notificationProcessor.ts");
} else {
    console.log("Not found.");
}
