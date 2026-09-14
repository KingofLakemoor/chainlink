# 🤖 Google AI Studio & Firebase Deployment System Instructions

> **IMPORTANT**: Copy the contents of the **System Instructions** block below directly into your Google AI Studio / Gemini System Instructions field or prompt settings when generating code or building features for this repository.

---

## 📌 System Instructions for Google AI Studio

```markdown
### 🚨 MANDATORY AI STUDIO DEPLOYMENT & LOCKFILE DIRECTIVE 🚨

You are an AI developer working on the ChainLink 2.0 repository deployed via Firebase App Hosting and GCP Cloud Build.

Cloud Build deploys the app inside a Docker container using `RUN npm ci`. Unlike `npm install`, `npm ci` strictly requires `package.json` and `package-lock.json` to be 100% in sync across all platform-specific optional binaries (`@tailwindcss/oxide`, `@rollup`, `lightningcss`, etc.). If `package.json` is modified without regenerating `package-lock.json`, the Cloud Build deployment WILL FAIL with:
`npm error \`npm ci\` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.`

To prevent deployment failures, you MUST follow these hard-coded rules for every code change:

1. ⚡ **LOCKFILE SYNCHRONIZATION (CRITICAL)**:
   - NEVER edit `package.json` without running `npm install` immediately afterward to update `package-lock.json`.
   - Always install packages using standard `npm install <package-name>` so optional platform bindings are written into `package-lock.json`.
   - Never use `--no-save` or bypass lockfile generation.

2. 🧪 **CLEAN INSTALL VERIFICATION**:
   - Before completing any task or pushing code, ALWAYS test `npm ci` locally in the environment.
   - Run `npm run build && npx vitest run` to confirm that the production build bundle succeeds and test suite passes.

3. 📦 **GIT COMMIT COMPLIANCE**:
   - Whenever `package.json` is modified, `package-lock.json` MUST be staged and committed alongside `package.json` in the same git commit.
   - Never commit `package.json` alone.

4. 🐳 **DOCKER CONTAINER ENVIRONMENT COMPATIBILITY**:
   - The production container is built using Node 22 slim (`linux/amd64`). Do not remove or alter `RUN npm ci` in `Dockerfile`.
   - Ensure native platform bindings for Linux arm64/x64 and Darwin/Win32 remain present in `package-lock.json`.
```

---

## 🔍 Why Builds Fail When Deploying From AI Studio

### Root Cause
1. **Discrepancy Between `package.json` and `package-lock.json`**: When AI Studio adds or updates a package in `package.json`, `package-lock.json` is often left unchanged or generated only for a single local architecture.
2. **Missing Platform-Specific Binaries**: Packages like Tailwind CSS v4 (`@tailwindcss/vite`, `@tailwindcss/oxide`), Vite/Rollup (`@rollup/rollup-*`), and LightningCSS rely on optional platform-specific native binaries. If `npm install` is not executed to populate these platform entries in `package-lock.json`, `npm ci` in Docker throws an `EUSAGE` missing dependency error.
3. **Strict Enforcement by `npm ci`**: Firebase App Hosting Cloud Build builds the Docker container running `RUN npm ci`. `npm ci` refuses to proceed if even a single optional platform binding is missing from `package-lock.json`.

---

## 🛠️ Step-by-Step Fix Instructions for AI Studio Developers

If a Firebase Cloud Build fails during `RUN npm ci`:

1. Open bash terminal in your environment.
2. Run `npm install` to update `package-lock.json`.
3. Verify by running `npm ci`.
4. Run `npm run build && npx vitest run`.
5. Stage and commit both `package.json` and `package-lock.json`.
