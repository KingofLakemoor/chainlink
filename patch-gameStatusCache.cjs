const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

const targetStr = `        let data;
        if (gameStatusCache.has(config.gameId)) {
            data = gameStatusCache.get(config.gameId);
        } else {
            const doc = await adminDb.collection('matchups').doc(config.gameId).get();
            if (doc.exists) {
                data = doc.data();
                gameStatusCache.set(config.gameId, data);
            }
        }`;

const replaceStr = `        let data;
        if (gameStatusCache.has(config.gameId)) {
            const cached = gameStatusCache.get(config.gameId);
            if (cached instanceof Promise) {
                data = await cached;
            } else {
                data = cached;
            }
        } else {
            const fetchPromise = (async () => {
                const doc = await adminDb.collection('matchups').doc(config.gameId).get();
                if (doc.exists) {
                    return doc.data();
                }
                return null;
            })();
            
            gameStatusCache.set(config.gameId, fetchPromise);
            data = await fetchPromise;
            
            if (data) {
                gameStatusCache.set(config.gameId, data);
            } else {
                gameStatusCache.delete(config.gameId);
            }
        }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/services/propGrader.ts', code);
console.log("Patched propGrader.ts gameStatusCache");
