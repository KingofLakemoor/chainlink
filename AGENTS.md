# AGENTS.md

## 🚨 CRITICAL RULE FOR AI STUDIO & AI AGENTS (Preventing Firebase Deployment Clean Install Failures)

When deploying from AI Studio or building features using AI agents:

1. **AUTOMATED LOCKFILE SYNCHRONIZATION**: `package.json` includes `prebuild` and `prelint` hooks running `scripts/ensure-lockfile-sync.cjs`. Whenever `compile_applet` (`npm run build`) or `lint_applet` (`npm run lint`) is executed, `package-lock.json` is automatically checked and synchronized via `npm install`.
2. **MANUAL PACKAGE EDITS**: Whenever you manually add, modify, or remove packages in `package.json`, run `npm install` immediately afterward to keep `package-lock.json` in a perfectly synchronized state.
3. **CLEAN INSTALL VERIFICATION**: Run `npm ci --dry-run` or test `npm ci` before completing tasks to guarantee that Cloud Build (`RUN npm ci`) will pass cleanly without missing platform bindings (`@tailwindcss/oxide`, `lightningcss`, `@rollup`, etc.).
4. **ATOMIC COMMITS**: Always ensure BOTH `package.json` AND `package-lock.json` are committed together when pushing from AI Studio. Never commit `package.json` alone.
5. **NO BYPASS**: Never use `--no-save` or attempt to bypass `package-lock.json` generation.

---

## 5. Synchronizing Package Configurations (Preventing `npm ci` Failures)
When you add, modify, or remove packages in `package.json`, you MUST ensure the lockfile (`package-lock.json`) is kept in a perfectly synchronized state to prevent Cloud Build / Firebase App Hosting rollout failures.

🚨 **Deployment Risk**: The deployment system uses `RUN npm ci` (standard practice for deterministic container builds). If `package.json` is modified and `package-lock.json` is not updated via `npm install`, `npm ci` will strictly fail with:
`npm error \`npm ci\` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.`

**To prevent this, the project has:**
- `scripts/ensure-lockfile-sync.cjs` wired into `prebuild` and `prelint` in `package.json`.
- A GitHub Action workflow `.github/workflows/lockfile-sync.yml` that checks and auto-syncs `package-lock.json` on push and PR.
- See `AISTUDIO_INSTRUCTIONS.md` for copy-pasteable system instructions for AI Studio environments.
