(async () => {
    const { adminDb } = await import('./dist/server.cjs').catch(() => import('./src/lib/firebase-admin.js'));
    const snaps = await adminDb.collection('matchups')
        .where('metadata.isPropMatchup', '==', true)
        .where('status', '==', 'STATUS_IN_PROGRESS')
        .get();
        
    let count = 0;
    let batch = adminDb.batch();
    for (const doc of snaps.docs) {
        const data = doc.data();
        if (data.abandoned || !data.active) continue;
        
        const picksSnap = await adminDb.collection('picks')
            .where('matchupId', '==', doc.id)
            .where('status', '==', 'PENDING')
            .get();
            
        if (picksSnap.empty) {
            console.log(`Abandoning prop ${doc.id} (${data.title || 'no title'}) - no picks`);
            batch.update(doc.ref, { abandoned: true, active: false });
            count++;
        }
        
        if (count % 400 === 0 && count > 0) {
            await batch.commit();
            batch = adminDb.batch();
        }
    }
    if (count > 0) await batch.commit();
    console.log(`Abandoned ${count} props.`);
    process.exit(0);
})();
