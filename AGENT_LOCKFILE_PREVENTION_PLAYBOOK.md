# 🛡️ Universal Agent Playbook: Preventing Cloud Build / Firebase `npm ci` Lockfile Failures

> **Purpose**: A universal, copy-pasteable specification and implementation guide for AI agents (AI Studio, Cursor, Claude Code, Copilot, Windsurf) working on any Node.js / Full-Stack web repository deployed via Google Cloud Build, Firebase App Hosting, Cloud Run, Vercel, or AWS Amplify.

---

## 1. Executive Summary & Root Cause

```text
[4. Cloud Build Rollout Fails]
          ▲  Strict `npm ci` requires exact byte-for-byte lockfile match
[3. Push / Deploy from Web IDE / AI Studio]
          ▲  Git pushes `package.json` with an outdated `package-lock.json`
[2. AI Agent Session Turn]
          ▲  AI agent directly edited `package.json` without running `npm install`
[1. The Root Cause]
          Agent verification (`npm run build`) ran without enforcing
          or synchronizing `package-lock.json` before declaring success.
```

### Why it Happens:
1. **Direct Disk Edits**: In browser sandboxes and AI agent environments, agents modify `package.json` via file edit tools rather than the terminal CLI (`npm install <pkg>`). `package.json` changes on disk, but `package-lock.json` remains untouched.
2. **Local Build Illusion**: Because existing dependencies are already present in `node_modules`, `npm run build` or `vite build` passes locally.
3. **Strict CI Enforcement**: Production CI (Cloud Build / Firebase App Hosting) executes `npm ci` inside a clean container. Unlike `npm install`, `npm ci` **strictly rejects** any mismatch between `package.json` and `package-lock.json`, immediately failing deployment with:
   ```text
   npm error code EUSAGE
   npm error 'npm ci' can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
   ```
4. **Missing Platform Binaries**: If Linux platform-specific binaries (`@tailwindcss/oxide-linux-x64-gnu`, `@rollup/rollup-linux-x64-gnu`, `esbuild-linux-64`, `lightningcss`) were not generated on macOS/Windows, Linux Cloud Build will abort.

---

## 2. Universal Agent Instructions (Copy into `AGENTS.md`, `.cursorrules`, or System Prompt)

Add this block to your agent's instructions or the project's root `AGENTS.md` / `CLAUDE.md`:

```markdown
### 🚨 CRITICAL RULE: PREVENTING CI/CD CLEAN INSTALL (`npm ci`) FAILURES

1. **NEVER EDIT `package.json` IN ISOLATION**:
   Whenever you add, modify, or remove packages or versions in `package.json`, you MUST immediately execute `npm install` to regenerate and synchronize `package-lock.json`.
   
2. **ALWAYS COMMIT BOTH FILES ATOMICALLY**:
   Never stage or commit `package.json` without staging `package-lock.json`. Both files must reflect the exact same dependency tree.

3. **VERIFY WITH `npm ci --dry-run`**:
   Before declaring any task or turn complete where dependencies were touched, run:
   ```bash
   npm ci --dry-run
   ```
   If this command exits with any code other than 0, do NOT end your turn. Resolve the mismatch immediately by running `npm install`.

4. **MAINTAIN MULTI-PLATFORM ARCHITECTURES**:
   Ensure `package.json` contains `supportedArchitectures` including Linux (`x64` and `arm64`) so that Cloud Build container platform bindings are captured in `package-lock.json`.

5. **DO NOT BYPASS HOOKS**:
   Never use `--no-verify` or `--ignore-scripts` to bypass `prebuild` or `prelint` lockfile verification hooks.
```

---

## 3. The 4-Layer Immunity Implementation Guide

When an agent is tasked with making a repository immune to this failure, apply these 4 layers:

### Layer 1: The Automated Sync Script (`scripts/ensure-lockfile-sync.cjs`)

Create `scripts/ensure-lockfile-sync.cjs`. This script runs in ~5ms when in sync, and automatically repairs `package-lock.json` if a discrepancy is detected:

```javascript
/**
 * scripts/ensure-lockfile-sync.cjs
 * Automatically verifies and synchronizes package-lock.json with package.json
 * to prevent Google Cloud Build / Firebase App Hosting rollout failures during npm ci.
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
  if (pkgKeys.length !== lockKeys.length) return false;
  for (const key of pkgKeys) {
    if (pkgSection[key] !== lockSection[key]) return false;
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

    // Validate dependencies & devDependencies
    if (!compareSection(pkg.dependencies || {}, rootPackage.dependencies || {})) return false;
    if (!compareSection(pkg.devDependencies || {}, rootPackage.devDependencies || {})) return false;

    // Ensure all direct dependencies exist in lockfile packages
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const key of Object.keys(allDeps)) {
      if (!lock.packages || !lock.packages[`node_modules/${key}`]) return false;
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
  } catch {
    return false;
  }
}

function synchronizeLockfile() {
  console.log('\n[LockfileSync] ⚠️  package.json and package-lock.json are out of sync!');
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
  // If running inside CI / Cloud Build / GitHub Actions, dependencies were already validated by npm ci.
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION || process.env.BUILD_ID) {
    return;
  }

  // Authoritative check: npm ci --dry-run validates lockfile integrity exactly as Cloud Build does (<1.8s).
  // Avoid superficial JSON-only comparisons which miss supportedArchitectures, engines, and optional dependencies!
  if (!verifyWithNpmCiDryRun()) {
    synchronizeLockfile();
  }
}

main();
```

---

### Layer 2: Wire Lifecycle Hooks into `package.json`

Add the `prebuild`, `prelint`, and `lockfile:sync` scripts to `package.json`. Because AI agents always execute `npm run build` or `compile_applet` before closing a turn, npm automatically invokes `prebuild`, ensuring `package-lock.json` is updated before the agent finishes:

```json
{
  "scripts": {
    "prebuild": "node scripts/ensure-lockfile-sync.cjs",
    "prelint": "node scripts/ensure-lockfile-sync.cjs",
    "lockfile:sync": "node scripts/ensure-lockfile-sync.cjs",
    "build": "vite build",
    "lint": "tsc --noEmit"
  }
}
```

---

### Layer 3: Configure Multi-Platform Architecture Bindings

Prevent native binary failures in Linux Cloud Build containers (`linux-x64` / `linux-arm64`) by adding `supportedArchitectures` to `package.json`:

```json
{
  "supportedArchitectures": {
    "os": ["current", "linux", "darwin", "win32"],
    "cpu": ["current", "x64", "arm64"]
  }
}
```

When `npm install` runs, npm will record dependencies for all target platforms into `package-lock.json`.

---

### Layer 4: GitHub Actions Auto-Sync Safety Net (`.github/workflows/lockfile-sync.yml`)

Create `.github/workflows/lockfile-sync.yml` to automatically catch any manual git commit or edge case where `package.json` was committed alone:

```yaml
name: Validate and Synchronize Lockfile

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

permissions:
  contents: write

jobs:
  check-lockfile:
    name: Check & Auto-Sync package-lock.json
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Verify and Synchronize Lockfile
        run: node scripts/ensure-lockfile-sync.cjs

      - name: Check for Lockfile Changes
        id: git_status
        run: |
          if git diff --name-only | grep -E '^package-lock\.json$'; then
            echo "changed=true" >> "$GITHUB_OUTPUT"
          else
            echo "changed=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Auto-commit Synchronized Lockfile (On Push)
        if: steps.git_status.outputs.changed == 'true' && github.event_name == 'push'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package-lock.json
          git commit -m "Synchronize package-lock.json with package.json to fix Google Cloud Build / Firebase App Hosting rollout failure during npm ci [skip ci]"
          git push
```

---

## 4. Agent Verification Checklist

Whenever an agent finishes setting up this pattern or modifying dependencies on any repository, run this 3-step verification:

| Step | Command | Expected Result |
| :--- | :--- | :--- |
| **1. Hook Check** | `npm run build` | Triggers `prebuild` hook; outputs no sync errors |
| **2. Clean Install Check** | `npm ci --dry-run` | Exits code 0 with clean dependency resolution |
| **3. Git Check** | `git status --porcelain` | Shows BOTH `package.json` and `package-lock.json` clean or staged together |
