# 🤖 Google AI Studio & Firebase Deployment System Instructions

> **IMPORTANT**: Copy the contents of the **System Instructions** block below directly into your Google AI Studio / Gemini System Instructions field or prompt settings when generating code or building features for this repository.

---

## 📌 System Instructions for Google AI Studio

```markdown
### 🚨 MANDATORY AI STUDIO DEPLOYMENT & LOCKFILE DIRECTIVE 🚨

You are an AI developer working on this repository deployed via Firebase App Hosting and GCP Cloud Build.

Cloud Build deploys the app inside a container using `npm ci`. Unlike `npm install`, `npm ci` strictly requires `package.json` and `package-lock.json` to be 100% in sync across all dependencies and platform-specific optional binaries (`@tailwindcss/oxide`, `@rollup`, `lightningcss`, etc.). If `package.json` is modified without regenerating `package-lock.json`, the Cloud Build deployment WILL FAIL with:
`npm error \`npm ci\` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.`

To prevent deployment failures, the repository enforces these protections:

1. ⚡ **AUTOMATED PREBUILD & PRELINT SYNC**:
   - `package.json` has `prebuild` and `prelint` hooks that run `node scripts/ensure-lockfile-sync.cjs`.
   - Whenever `compile_applet` (`npm run build`) or `lint_applet` (`npm run lint`) runs, `package-lock.json` is automatically checked and updated via `npm install` if `package.json` has changed.

2. ⚡ **LOCKFILE SYNCHRONIZATION**:
   - When manually editing `package.json`, immediately run `npm install` to keep `package-lock.json` in sync.
   - Never use `--no-save` or bypass lockfile generation.

3. 🧪 **CLEAN INSTALL VERIFICATION**:
   - Before finishing any turn where packages are changed, run `npm ci --dry-run` or `compile_applet`.

4. 📦 **ATOMIC COMMITS**:
   - Whenever `package.json` is changed, ensure `package-lock.json` is committed alongside it.

5. 🐳 **CROSS-PLATFORM ARCHITECTURES**:
   - `package.json` specifies `supportedArchitectures` (linux x64/arm64, darwin, win32) so `npm install` populates all necessary native bindings for Cloud Build.
```

---

## 🔍 Why Builds Fail When Deploying From AI Studio

### Root Cause
1. **AI Studio direct file modifications**: When an AI agent in AI Studio modifies `package.json` (adding a library or updating scripts), `package-lock.json` on disk is not updated unless `npm install` is executed.
2. **Strict Enforcement by `npm ci`**: Firebase App Hosting runs Google Cloud Build, which invokes `npm ci`. Unlike `npm install`, `npm ci` refuses to proceed if `package.json` and `package-lock.json` differ in dependencies or versions.
3. **The Solution**: 
   - Automated `prebuild` & `prelint` hooks via `scripts/ensure-lockfile-sync.cjs` ensure `package-lock.json` is synced before compilation completes.
   - GitHub Action `.github/workflows/lockfile-sync.yml` catches and automatically commits any missed lockfile updates on push.
