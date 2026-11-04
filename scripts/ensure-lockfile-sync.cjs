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

function checkMissingOptionalDeps() {
  if (!fs.existsSync(lockPath)) return false;
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const packages = lock.packages || {};
    for (const [pkgPathKey, pkgData] of Object.entries(packages)) {
      if (pkgData && pkgData.optionalDependencies) {
        for (const optDep of Object.keys(pkgData.optionalDependencies)) {
          const expectedPath = `node_modules/${optDep}`;
          if (!packages[expectedPath]) {
            return false;
          }
        }
      }
    }
    return true;
  } catch {
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
  console.log('\n[LockfileSync] ⚠️  Discrepancy detected between package.json and package-lock.json (or missing optional cross-platform native binaries)!');
  console.log('[LockfileSync] 🔄 Running lockfile synchronization for npm 11 and cross-platform native binaries...');

  try {
    try {
      execSync('npx -y npm@11.19.1 install --package-lock-only', { cwd: rootDir, stdio: 'inherit' });
    } catch {
      execSync('npm install --package-lock-only', { cwd: rootDir, stdio: 'inherit' });
    }
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('[LockfileSync] ✅ package-lock.json is now synchronized and contains all cross-platform native optional dependencies.\n');
  } catch (error) {
    console.error('[LockfileSync] ❌ Failed to synchronize package-lock.json:', error.message);
    process.exit(1);
  }
}

function main() {
  const isForceSync = process.argv.includes('--force-sync') || process.argv.includes('--force');

  // Skip running `npm install` if inside a true Cloud Build container where `npm ci` has already run
  // Note: Do NOT check K_SERVICE, as AI Studio development environments run on Cloud Run and have K_SERVICE set!
  const isCloudBuild = Boolean(
    process.env.BUILD_ID ||
    process.env.CLOUDBUILD_BUILD_ID
  );

  if (!isForceSync && (isCloudBuild || (process.env.CI && !process.env.K_SERVICE))) {
    return;
  }

  // Authoritative check:
  // 1. Fast direct dependency check
  // 2. Comprehensive check that ALL optional dependencies declared by any package exist in lockfile packages (cross-platform native binaries for Cloud Build)
  // 3. npm ci --dry-run verification
  const fastInSync = isFastCheckInSync();
  const optionalDepsOk = checkMissingOptionalDeps();
  const dryRunOk = fastInSync && optionalDepsOk && verifyWithNpmCiDryRun();

  if (isForceSync || !dryRunOk) {
    synchronizeLockfile();
  }

  // Ensure git hook permissions are preserved across all environments
  const hookPath = path.join(rootDir, '.githooks', 'pre-commit');
  if (fs.existsSync(hookPath)) {
    try {
      const stats = fs.statSync(hookPath);
      // Ensure user, group, and others have execute bit set (0o755)
      if ((stats.mode & 0o111) !== 0o111) {
        fs.chmodSync(hookPath, 0o755);
      }
    } catch {
      // Ignore permission errors if file system does not support chmod (e.g. Windows)
    }
  }
}

main();
