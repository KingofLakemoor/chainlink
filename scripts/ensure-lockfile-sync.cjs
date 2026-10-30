/**
 * scripts/ensure-lockfile-sync.cjs
 *
 * Automatically verifies and synchronizes package-lock.json with package.json
 * to prevent Google Cloud Build and Firebase App Hosting rollout failures during `npm ci`.
 *
 * This runs automatically via npm's `prebuild` and `prelint` lifecycle hooks.
 * - When already synchronized: Exits cleanly in ~5ms.
 * - When out of sync: Automatically runs `npm install` to regenerate `package-lock.json`.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

function compareSection(pkgSection = {}, lockSection = {}) {
  const pkgKeys = Object.keys(pkgSection);
  const lockKeys = Object.keys(lockSection);

  if (pkgKeys.length !== lockKeys.length) {
    return false;
  }

  for (const key of pkgKeys) {
    if (pkgSection[key] !== lockSection[key]) {
      return false;
    }
  }

  return true;
}

function isFastCheckInSync() {
  if (!fs.existsSync(pkgPath)) return true;
  if (!fs.existsSync(lockPath)) return false;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

    const rootPackage = lock.packages && lock.packages[''] ? lock.packages[''] : {};

    // Check direct dependencies
    if (!compareSection(pkg.dependencies || {}, rootPackage.dependencies || {})) {
      return false;
    }

    // Check devDependencies
    if (!compareSection(pkg.devDependencies || {}, rootPackage.devDependencies || {})) {
      return false;
    }

    // Ensure all direct dependencies exist in lockfile packages node_modules
    const allPkgDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const key of Object.keys(allPkgDeps)) {
      const modKey = `node_modules/${key}`;
      if (!lock.packages || !lock.packages[modKey]) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

function verifyWithNpmCiDryRun() {
  try {
    execSync('npm ci --dry-run', { cwd: rootDir, stdio: 'pipe' });
    return true;
  } catch (err) {
    return false;
  }
}

function synchronizeLockfile() {
  console.log('\n[LockfileSync] ⚠️  Discrepancy detected between package.json and package-lock.json!');
  console.log('[LockfileSync] 🔄 Running `npm install` to regenerate package-lock.json...');

  try {
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('[LockfileSync] ✅ package-lock.json is now synchronized with package.json.\n');
  } catch (error) {
    console.error('[LockfileSync] ❌ Failed to synchronize package-lock.json:', error.message);
    process.exit(1);
  }
}

function main() {
  const isForceSync = process.argv.includes('--force-sync') || process.argv.includes('--force');

  // Skip running `npm install` if inside a Cloud Build container where `npm ci` has already run
  // and network/write access might be restricted during buildpack compilation steps.
  const isCloudBuild = Boolean(
    process.env.BUILD_ID ||
    process.env.CLOUDBUILD_BUILD_ID ||
    process.env.K_SERVICE
  );

  if (!isForceSync && (isCloudBuild || process.env.CI || process.env.CONTINUOUS_INTEGRATION)) {
    return;
  }

  // Authoritative check: npm ci --dry-run validates lockfile integrity exactly as Cloud Build does.
  // This catches supportedArchitectures, engines, optionalDependencies, and transitive discrepancies
  // that superficial JSON checks miss.
  const dryRunOk = verifyWithNpmCiDryRun();
  if (!dryRunOk) {
    synchronizeLockfile();
  }
}

main();
