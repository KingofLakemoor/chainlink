import fs from 'fs';
const content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const routeCode = `
apiRouter.post("/admin/process-notifications", validateAdmin, async (req, res) => {
  try {
    if (!adminDb || !adminMessaging) {
      return res.status(500).json({ success: false, error: 'Firebase Admin not fully initialized' });
    }

    const pendingNotifsSnap = await adminDb.collection('notifications')
      .where('status', '==', 'PENDING')
      .limit(50)
      .get();

    if (pendingNotifsSnap.empty) {
      return res.json({ success: true, processed: 0 });
    }

    let processedCount = 0;
    const batch = adminDb.batch();

    for (const doc of pendingNotifsSnap.docs) {
      const notifData = doc.data();
      const audience = notifData.audience || 'USER';
      const targetUserId = notifData.targetUserId || notifData.userId;
      let targetTokens = [];

      try {
        if (audience === 'USER' && targetUserId) {
          const userDoc = await adminDb.collection('users').doc(targetUserId).get();
          if (userDoc.exists && userDoc.data()?.fcmTokens && Array.isArray(userDoc.data().fcmTokens)) {
            targetTokens = userDoc.data().fcmTokens;
          }
        } else if (audience === 'GLOBAL') {
          // Send to everyone with fcmTokens
          const usersSnap = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
          usersSnap.forEach(u => {
            const tokens = u.data().fcmTokens;
            if (Array.isArray(tokens)) {
              targetTokens.push(...tokens);
            }
          });
        }
        
        targetTokens = [...new Set(targetTokens)]; // deduplicate

        if (targetTokens.length > 0) {
          const messagePayload = {
            notification: {
              title: notifData.title,
              body: notifData.body
            },
            tokens: targetTokens
          };
          
          for (let i = 0; i < targetTokens.length; i += 500) {
            const tokenChunk = targetTokens.slice(i, i + 500);
            await adminMessaging.sendEachForMulticast({
              ...messagePayload,
              tokens: tokenChunk
            });
          }
        }

        batch.update(doc.ref, {
          status: 'SENT',
          sentAt: Date.now(),
          sentCount: targetTokens.length
        });
        processedCount++;

      } catch (err: any) {
        console.error('Error processing notification', doc.id, err);
        batch.update(doc.ref, {
          status: 'FAILED',
          error: err.message,
          failedAt: Date.now()
        });
      }
    }

    await batch.commit();

    res.json({ success: true, processed: processedCount });
  } catch (e: any) {
    console.error('Process notifications error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});
`;

const insertionPoint = 'apiRouter.post("/admin/sync-schedules", validateAdmin, async (req, res) => {';
if (content.includes(insertionPoint)) {
  const newContent = content.replace(insertionPoint, routeCode + '\n' + insertionPoint);
  fs.writeFileSync('src/apiRouter.ts', newContent);
  console.log('Route added!');
} else {
  console.log('Could not find insertion point.');
}
