import fs from 'fs';
let content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const target = `transaction.update(userRef, { referralGranted: true, referralGrantedAt: Date.now(), referredBy: referrerId });`;
const replacement = `      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const monthlyStatsRef = adminDb.collection('settings').doc(\`monthlyStats_\${currentMonthStr}\`);
      
      transaction.update(userRef, { referralGranted: true, referralGrantedAt: Date.now(), referredBy: referrerId });
      transaction.set(monthlyStatsRef, { referrals: FieldValue.increment(1) }, { merge: true });`;

content = content.replace(target, replacement);
fs.writeFileSync('src/apiRouter.ts', content);
console.log("Patched apiRouter.ts");
