import { adminDb, adminMessaging } from '../lib/firebase-admin.js';

export function startNotificationListener() {
  if (!adminDb || !adminMessaging) {
    console.warn('Firebase Admin not fully initialized. Notification listener not started.');
    return;
  }

  console.log('Starting event-driven notification listener...');
  
  // Listen for new pending notifications
  adminDb.collection('notifications')
    .where('status', '==', 'PENDING')
    .onSnapshot(async (snapshot) => {
      if (snapshot.empty) return;
      
      for (const doc of snapshot.docs) {
        // Run in transaction to prevent multiple instances from processing the same notification
        try {
          const success = await adminDb.runTransaction(async (transaction) => {
            const notifRef = doc.ref;
            const notifDoc = await transaction.get(notifRef);
            
            if (!notifDoc.exists || notifDoc.data()?.status !== 'PENDING') {
              return false; // Already processed by another instance
            }

            // Claim the notification
            transaction.update(notifRef, { 
              status: 'PROCESSING', 
              processingStartedAt: Date.now() 
            });
            return true;
          });

          if (success) {
            await processSingleNotification(doc.id, doc.data());
          }
        } catch (error) {
          console.error(`Error claiming notification ${doc.id}:`, error);
        }
      }
    }, (error) => {
      console.error('Notification listener error:', error);
    });
}

async function processSingleNotification(notifId: string, notifData: any) {
  try {
    const audience = notifData.audience || 'USER';
    const targetUserId = notifData.targetUserId || notifData.userId;
    let targetTokens: string[] = [];
    const failedTokensToClean: string[] = [];

    if (audience === 'USER' && targetUserId) {
      const userDoc = await adminDb!.collection('users').doc(targetUserId).get();
      if (userDoc.exists && userDoc.data()?.fcmTokens && Array.isArray(userDoc.data()?.fcmTokens)) {
        targetTokens = userDoc.data()?.fcmTokens;
      }
    } else if (audience === 'ADMIN') {
      const adminsSnap = await adminDb!.collection('users').where('role', '==', 'ADMIN').get();
      adminsSnap.forEach(u => {
        const tokens = u.data().fcmTokens;
        if (Array.isArray(tokens)) {
          targetTokens.push(...tokens);
        }
      });
    } else if (audience === 'GLOBAL') {
      const usersSnap = await adminDb!.collection('users').where('fcmTokens', '!=', []).get();
      usersSnap.forEach(u => {
        const tokens = u.data().fcmTokens;
        if (Array.isArray(tokens)) {
          targetTokens.push(...tokens);
        }
      });
    }
    
    targetTokens = [...new Set(targetTokens)];
    let sentCount = 0;

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
        const response = await adminMessaging!.sendEachForMulticast({
          ...messagePayload,
          tokens: tokenChunk
        });
        
        sentCount += response.successCount;
        
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

    // Update status to SENT
    await adminDb!.collection('notifications').doc(notifId).update({
      status: 'SENT',
      sentAt: Date.now(),
      sentCount: sentCount
    });

    // Clean up failed tokens
    if (failedTokensToClean.length > 0) {
       const uniqueFailedTokens = [...new Set(failedTokensToClean)];
       for (let i = 0; i < uniqueFailedTokens.length; i += 10) {
           const chunk = uniqueFailedTokens.slice(i, i + 10);
           const usersWithFailedTokens = await adminDb!.collection('users')
               .where('fcmTokens', 'array-contains-any', chunk)
               .get();
               
           const tokenCleanupBatch = adminDb!.batch();
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
  } catch (error: any) {
    console.error(`Failed to process notification ${notifId}:`, error);
    await adminDb!.collection('notifications').doc(notifId).update({
      status: 'FAILED',
      error: error.message,
      updatedAt: Date.now()
    });
  }
}

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
    
    // We just manually process them here using the new function to avoid duplication
    for (const doc of pendingNotifsSnap.docs) {
      try {
        const success = await adminDb.runTransaction(async (transaction) => {
          const notifRef = doc.ref;
          const notifDoc = await transaction.get(notifRef);
          if (!notifDoc.exists || notifDoc.data()?.status !== 'PENDING') return false;
          transaction.update(notifRef, { status: 'PROCESSING', processingStartedAt: Date.now() });
          return true;
        });

        if (success) {
          await processSingleNotification(doc.id, doc.data());
          processedCount++;
        }
      } catch (e) {
        console.error('Error claiming doc in cron:', e);
      }
    }
    
    return { success: true, processed: processedCount };
  } catch (err: any) {
    console.error('Process notifications error:', err);
    return { success: false, error: err.message };
  }
}
