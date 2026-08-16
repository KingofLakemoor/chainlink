(async () => {
    const { adminDb } = await import('./dist/server.cjs').catch(() => import('./src/lib/firebase-admin.js'));
    const snaps = await adminDb.collection('matchups')
        .where('metadata.isPropMatchup', '==', true)
        .where('status', '==', 'STATUS_SCHEDULED')
        .get();
        
    let count = 0;
    for (const doc of snaps.docs) {
        const data = doc.data();
        if (data.startTime && Date.now() >= data.startTime) {
            console.log(`Locking prop ${doc.id}`);
            await adminDb.collection('matchups').doc(doc.id).update({
                status: 'STATUS_IN_PROGRESS',
                statusDesc: 'In Progress'
            });
            count++;
        }
    }
    console.log(`Locked ${count} props.`);
    process.exit(0);
})();
