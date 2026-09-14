# AGENTS.md

## 🚨 CRITICAL RULE FOR AI STUDIO & AI AGENTS (Preventing Firebase Deployment Clean Install Failures)

When deploying from AI Studio or building features using AI agents:

1. **LOCKFILE SYNCHRONIZATION**: Whenever you add, modify, or remove packages in `package.json`, you MUST run `npm install` immediately afterward to keep `package-lock.json` in a perfectly synchronized state.
2. **CLEAN INSTALL VERIFICATION**: You MUST run `npm ci` before committing code to ensure that Cloud Build Docker deployment (`RUN npm ci`) will pass cleanly without missing platform bindings (`@tailwindcss/oxide`, `lightningcss`, `@rollup`, etc.).
3. **ATOMIC COMMITS**: Always stage and commit BOTH `package.json` AND `package-lock.json` in the same commit. Never commit `package.json` alone.
4. **NO BYPASS**: Never use `--no-save` or attempt to bypass `package-lock.json` generation.

---

## 5. Synchronizing Package Configurations (Preventing `npm ci` Failures)
When you add, modify, or remove packages in `package.json`, you MUST ensure the lockfile (`package-lock.json`) is kept in perfectly synchronized state to prevent Cloud Build Docker deployment failures.

🚨 **Deployment Risk**: The deployment system uses `RUN npm ci` (standard practice for deterministic container builds). If `package.json` is modified manually and `package-lock.json` is not updated via `npm install`, `npm ci` will strictly fail with: `npm error \`npm ci\` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.`

**To prevent this, you MUST:**
- Run `npm install` locally immediately after manually editing `package.json` to regenerate the lockfile.
- Always ensure both `package.json` AND `package-lock.json` are in sync and both are committed.
- Never use `npm install <package> --no-save` or bypass lockfiles in CI.
- If a build fails with missing platform bindings (like `@esbuild`, `@tailwindcss/oxide`), run `npm install` locally to reconcile them into the lockfile.
- See `AISTUDIO_INSTRUCTIONS.md` for copy-pasteable system instructions for AI Studio environments.
