import { adminDb, adminMessaging } from '../lib/firebase-admin.js';

export async function processPendingNotifications() {
  if (!adminDb || !adminMessaging) {
    return { success: false, error: 'Firebase Admin not fully initialized' };
  }

  try {
    const pendingNotifsSnap = await adminDb.collection('notifications')
      .where('status', '==', 'PENDING')
      .limit(50)
      .get();

    if (pendingNotifsSnap.empty) {
      return { success: true, processed: 0 };
    }

    let processedCount = 0;
    const batch = adminDb.batch();
    const failedTokensToClean: string[] = [];

    for (const doc of pendingNotifsSnap.docs) {
      const notifData = doc.data();
      const audience = notifData.audience || 'USER';
      const targetUserId = notifData.targetUserId || notifData.userId;
      let targetTokens: string[] = [];

      if (audience === 'USER' && targetUserId) {
        const userDoc = await adminDb.collection('users').doc(targetUserId).get();
        if (userDoc.exists && userDoc.data()?.fcmTokens && Array.isArray(userDoc.data()?.fcmTokens)) {
          targetTokens = userDoc.data()?.fcmTokens;
        }
      } else if (audience === 'ADMIN') {
        const adminsSnap = await adminDb.collection('users').where('role', '==', 'ADMIN').get();
        adminsSnap.forEach(u => {
          const tokens = u.data().fcmTokens;
          if (Array.isArray(tokens)) {
            targetTokens.push(...tokens);
          }
        });
      } else if (audience === 'GLOBAL') {
        const usersSnap = await adminDb.collection('users').where('fcmTokens', '!=', []).get();
        usersSnap.forEach(u => {
          const tokens = u.data().fcmTokens;
          if (Array.isArray(tokens)) {
            targetTokens.push(...tokens);
          }
        });
      }
      
      targetTokens = [...new Set(targetTokens)];

      if (targetTokens.length > 0) {
        const rawData = notifData.data || {};
        const safeData: Record<string, string> = {};
        for (const key of Object.keys(rawData)) {
            safeData[key] = String(rawData[key]);
        }

        const messagePayload = {
          data: {
            ...safeData,
            title: String(notifData.title || ''),
            body: String(notifData.body || '')
          }
        };
        
        for (let i = 0; i < targetTokens.length; i += 500) {
          const tokenChunk = targetTokens.slice(i, i + 500);
          const response = await adminMessaging.sendEachForMulticast({
            ...messagePayload,
            tokens: tokenChunk
          });
          
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success && resp.error) {
                if (resp.error.code === 'messaging/invalid-registration-token' ||
                    resp.error.code === 'messaging/registration-token-not-registered') {
                  failedTokensToClean.push(tokenChunk[idx]);
                }
              }
            });
          }
        }
      }

      batch.update(doc.ref, {
        status: 'SENT',
        sentAt: Date.now(),
        sentCount: targetTokens.length
      });
      processedCount++;
    }

    await batch.commit();

    // Clean up failed tokens
    if (failedTokensToClean.length > 0) {
       const uniqueFailedTokens = [...new Set(failedTokensToClean)];
       // process in chunks of 10 for array-contains-any
       for (let i = 0; i < uniqueFailedTokens.length; i += 10) {
           const chunk = uniqueFailedTokens.slice(i, i + 10);
           const usersWithFailedTokens = await adminDb.collection('users')
               .where('fcmTokens', 'array-contains-any', chunk)
               .get();
               
           const tokenCleanupBatch = adminDb.batch();
           usersWithFailedTokens.forEach(uDoc => {
               const currentTokens = uDoc.data().fcmTokens || [];
               const newTokens = currentTokens.filter((t: string) => !chunk.includes(t));
               tokenCleanupBatch.update(uDoc.ref, { fcmTokens: newTokens });
           });
           
           if (usersWithFailedTokens.size > 0) {
               await tokenCleanupBatch.commit();
           }
       }
    }

    return { success: true, processed: processedCount };
  } catch (err: any) {
    console.error('Process notifications error:', err);
    return { success: false, error: err.message };
  }
}
