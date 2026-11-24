import fs from 'fs';
import path from 'path';
import { adminDb } from '../src/lib/firebase-admin.ts';

interface ReconciliationResult {
  userId: string;
  email: string;
  username: string;
  chainlinkLinks: number;
  coreLinks: number;
  finalLinks: number;
  deltaChainlink: number;
  deltaCore: number;
  targetWalletId: string;
  source: string;
}

/**
 * Migration & Reconciliation Script for ChainLink -> Central Core Links Wallet
 *
 * Rules:
 * 1. ChainLink total above 100 -> becomes official wallet amount base.
 * 2. ChainLink total below 100 -> use 100 as base wallet amount.
 * 3. Core wallet total above 100 -> add anything over 100 (surplus) to ChainLink total if ChainLink > Core wallet.
 *    If Core wallet >= ChainLink total, use max(base, Core wallet).
 *
 * Usage:
 *   npx tsx scripts/reconcile_chainlink_wallets.ts [--dry-run | --apply]
 */
async function run() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply;

  console.log(`=======================================================`);
  console.log(`Club 602 / ChainLink Wallet Migration & Reconciliation`);
  console.log(`Mode: ${isApply ? '🚀 APPLY (LIVE COMMITS)' : '🔍 DRY-RUN (AUDIT ONLY)'}`);
  console.log(`=======================================================\n`);

  if (!adminDb) {
    console.error('❌ Firebase Admin DB not initialized. Check credentials.');
    process.exit(1);
  }

  const timestamp = Date.now();
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Fetch all ChainLink users
  console.log('1. Fetching all ChainLink users...');
  const usersSnap = await adminDb.collection('users').get();
  console.log(`   Found ${usersSnap.size} total ChainLink users.`);

  // Save pre-migration backup of ChainLink users
  const chainlinkBackupPath = path.join(backupDir, `chainlink_users_backup_${timestamp}.json`);
  const chainlinkUsersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  fs.writeFileSync(chainlinkBackupPath, JSON.stringify(chainlinkUsersData, null, 2));
  console.log(`   💾 Snapshot saved to: ${chainlinkBackupPath}\n`);

  // 2. Fetch Central Core wallets and users via Central Gateway
  console.log('2. Querying Central Core wallets via api.club602.com...');
  const results: ReconciliationResult[] = [];

  let countTotal = 0;
  let countUpdated = 0;
  let totalChainlinkLinksBefore = 0;
  let totalReconciledLinksAfter = 0;

  for (const doc of usersSnap.docs) {
    countTotal++;
    const u = doc.data();
    const userId = doc.id;
    const email = (u.email || '').trim().toLowerCase();
    const username = u.username || u.name || 'Anonymous';
    const chainlinkLinks = Number(u.links ?? 0);
    totalChainlinkLinksBefore += chainlinkLinks;

    let coreLinks = 100; // default baseline if no central wallet exists yet
    let targetWalletId = `wlt_${userId}`;

    // Query Central Core by email
    if (email) {
      try {
        const res = await fetch(`https://api.club602.com/v1/wallet/${targetWalletId}?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const wData = await res.json();
          coreLinks = Number(wData.availableBalance ?? wData.balance ?? 100);
          if (wData.walletId) targetWalletId = wData.walletId;
        }
      } catch (err) {
        // Silently use default
      }
    }

    // Apply the exact user rules:
    // Rule 1 & 2: Base from ChainLink
    const base = chainlinkLinks < 100 ? 100 : chainlinkLinks;

    // Rule 3: Add core surplus above 100 if ChainLink > core
    let finalLinks = base;
    let calculationSource = 'ChainLink Base Floor (100)';

    if (chainlinkLinks >= 100) {
      if (coreLinks > 100 && chainlinkLinks > coreLinks) {
        const surplus = coreLinks - 100;
        finalLinks = chainlinkLinks + surplus;
        calculationSource = `ChainLink (${chainlinkLinks}) + Core Surplus (${surplus})`;
      } else if (coreLinks >= chainlinkLinks) {
        finalLinks = coreLinks;
        calculationSource = `Core Wallet Balance (${coreLinks})`;
      } else {
        finalLinks = chainlinkLinks;
        calculationSource = `ChainLink Balance (${chainlinkLinks})`;
      }
    } else {
      // chainlinkLinks < 100
      if (coreLinks > 100) {
        finalLinks = coreLinks;
        calculationSource = `Floor elevated by Core Wallet (${coreLinks})`;
      } else {
        finalLinks = 100;
        calculationSource = 'Floor raised to 100';
      }
    }

    totalReconciledLinksAfter += finalLinks;

    const deltaChainlink = finalLinks - chainlinkLinks;
    const deltaCore = finalLinks - coreLinks;
    if (deltaChainlink !== 0 || deltaCore !== 0) {
      countUpdated++;
    }

    results.push({
      userId,
      email: email || 'NO_EMAIL',
      username,
      chainlinkLinks,
      coreLinks,
      finalLinks,
      deltaChainlink,
      deltaCore,
      targetWalletId,
      source: calculationSource
    });
  }

  // 3. Print Reconciliation Summary Table
  console.log(`\n================== RECONCILIATION AUDIT REPORT ==================`);
  console.log(`Total Users Processed:     ${countTotal}`);
  console.log(`Users with Balance Change: ${countUpdated}`);
  console.log(`Total Links Before:        ${totalChainlinkLinksBefore.toLocaleString()}`);
  console.log(`Total Links After:         ${totalReconciledLinksAfter.toLocaleString()}`);
  console.log(`Net Ecosystem Delta:       +${(totalReconciledLinksAfter - totalChainlinkLinksBefore).toLocaleString()} Links`);
  console.log(`=================================================================\n`);

  // Show top adjusted users
  const notable = results
    .filter(r => r.deltaChainlink !== 0 || r.finalLinks > 100)
    .sort((a, b) => b.finalLinks - a.finalLinks)
    .slice(0, 20);

  console.log(`Sample of Top / Modified Balances:`);
  console.table(notable.map(r => ({
    Email: r.email,
    Username: r.username,
    'ChainLink (Old)': r.chainlinkLinks,
    'Core (Old)': r.coreLinks,
    'Final Balance': r.finalLinks,
    'Delta': r.deltaChainlink >= 0 ? `+${r.deltaChainlink}` : `${r.deltaChainlink}`,
    Rule: r.source
  })));

  // Write full audit log JSON
  const auditPath = path.join(backupDir, `reconciliation_audit_${timestamp}.json`);
  fs.writeFileSync(auditPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full audit report saved to: ${auditPath}`);

  // 4. Apply Changes if --apply was passed
  if (isApply) {
    console.log(`\n🚀 Applying updates to Firestore...`);
    let batch = adminDb.batch();
    let batchCount = 0;
    let committedCount = 0;

    for (const r of results) {
      const userRef = adminDb.collection('users').doc(r.userId);
      batch.update(userRef, {
        links: r.finalLinks,
        walletId: r.targetWalletId,
        reconciledAt: timestamp,
        updatedAt: timestamp
      });

      // Write transaction log for tracking
      if (r.deltaChainlink !== 0) {
        const txRef = adminDb.collection('linkTransactions').doc();
        batch.set(txRef, {
          userId: r.userId,
          username: r.username,
          type: 'WALLET_CONSOLIDATION',
          amount: r.deltaChainlink,
          description: `Consolidated to Central Club 602 Wallet (${r.source})`,
          createdAt: timestamp
        });
        batchCount++;
      }

      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        committedCount += batchCount;
        console.log(`   Committed batch of ${batchCount} operations...`);
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      committedCount += batchCount;
      console.log(`   Committed final batch of ${batchCount} operations...`);
    }

    console.log(`\n✅ Migration successfully committed! ${committedCount} total operations applied.`);
  } else {
    console.log(`\n🔒 Dry-run complete. NO changes were written to production.`);
    console.log(`   Run with --apply tonight when you are ready to commit.`);
  }
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
