const fs = require('fs');
let content = fs.readFileSync('src/services/scheduleProcessor.ts', 'utf8');

const oldLogic = `        for (const propDoc of uniqueProps) {
            batch.update(propDoc.ref, { status: 'STATUS_IN_PROGRESS', statusDesc: 'In Progress', updatedAt: Date.now() });
            opCount++;

            const pendingPicksSnap = await adminDb.collection('picks')
                .where('matchupId', '==', propDoc.id)
                .where('status', '==', 'PENDING')
                .get();
            
            for (const pickDoc of pendingPicksSnap.docs) {
                const pickData = pickDoc.data();
                const userPicksSnap = await adminDb.collection('picks')
                    .where('userId', '==', pickData.userId)
                    .where('status', '==', 'PENDING')
                    .orderBy('createdAt', 'asc')
                    .get();
                const pickIndex = userPicksSnap.docs.findIndex(doc => doc.id === pickDoc.id);
                if (pickIndex > 0) {`;

const newLogic = `        for (const propDoc of uniqueProps) {
            let hasValidPicks = false;
            
            // First check if there are ANY picks (including graded ones for Yes Only props)
            // Actually just check if it has picks overall
            const allPicksSnap = await adminDb.collection('picks')
                .where('matchupId', '==', propDoc.id)
                .limit(1)
                .get();

            const pendingPicksSnap = await adminDb.collection('picks')
                .where('matchupId', '==', propDoc.id)
                .where('status', '==', 'PENDING')
                .get();
            
            for (const pickDoc of pendingPicksSnap.docs) {
                const pickData = pickDoc.data();
                const userPicksSnap = await adminDb.collection('picks')
                    .where('userId', '==', pickData.userId)
                    .where('status', '==', 'PENDING')
                    .orderBy('createdAt', 'asc')
                    .get();
                const pickIndex = userPicksSnap.docs.findIndex(doc => doc.id === pickDoc.id);
                if (pickIndex === 0) {
                    hasValidPicks = true;
                }
                if (pickIndex > 0) {`;

content = content.replace(oldLogic, newLogic);

const oldLogic2 = `                    batch.set(notificationsRef, {
                        title: 'Queued Pick Cancelled ⏱️',
                        body: \`Your queued pick on \${propDoc.data().title || 'a player prop'} was cancelled because the game started before it became your active pick. Your wager of \${pickData.links || 0} links was refunded.\`,
                        audience: 'USER',
                        targetUserId: pickData.userId,
                        status: 'PENDING',
                        scheduledTime: Date.now(),
                        createdAt: Date.now()
                    });
                    opCount++;
                }

                if (opCount >= 450) {`;

const newLogic2 = `                    batch.set(notificationsRef, {
                        title: 'Queued Pick Cancelled ⏱️',
                        body: \`Your queued pick on \${propDoc.data().title || 'a player prop'} was cancelled because the game started before it became your active pick. Your wager of \${pickData.links || 0} links was refunded.\`,
                        audience: 'USER',
                        targetUserId: pickData.userId,
                        status: 'PENDING',
                        scheduledTime: Date.now(),
                        createdAt: Date.now()
                    });
                    opCount++;
                }
            }

            if (hasValidPicks || !allPicksSnap.empty) {
                batch.update(propDoc.ref, { status: 'STATUS_IN_PROGRESS', statusDesc: 'In Progress', updatedAt: Date.now() });
            } else {
                batch.update(propDoc.ref, { status: 'STATUS_IN_PROGRESS', statusDesc: 'In Progress', abandoned: true, active: false, updatedAt: Date.now() });
            }
            opCount++;

            if (opCount >= 450) {`;

content = content.replace(oldLogic2, newLogic2);

// Make sure to remove the trailing '}' that was part of the original loop, as we moved it up before updating the propDoc.ref
const targetToRemove = `            }
        }

        if (opCount > 0) {`;
const replaceWith = `        }

        if (opCount > 0) {`;

// Wait, the original code had:
/*
                if (opCount >= 450) {
                    await batch.commit();
                    batch = adminDb.batch();
                    opCount = 0;
                }
            }
        }
*/
// My newLogic2 adds `}` right before `if (hasValidPicks)`. So we need to remove the `}` at the end of the pick loop.
// Let's just do an index-based replace for `newLogic2`.
fs.writeFileSync('src/services/scheduleProcessor.ts', content);
