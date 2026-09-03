# 🔗 ChainLink 2.0

ChainLink 2.0 is a modern, highly responsive sports pick 'em platform designed to unite fans across all levels of competition. Rebuilt from the ground up to align with the design standards and community-first philosophy of Club 602, ChainLink is committed to an open, free, and inclusive internet.

ChainLink will always be free to play. We believe that community building happens when everyone has a seat at the table—or a spot on the board.

## ✨ What's New in 2.0?

* **Club 602 Integration:** We have opened the door to seamlessly integrate grassroots league sports into a publicly available pick 'em format. Users can now chain together predictions for major prime-time broadcasts alongside local competitive putting leagues, darts matches, billiards tournaments, and even flip cup events.
* **Dynamic Responsiveness:** Sports popularity shifts rapidly. Our new architecture allows administrators to instantly adapt to real-time changes, elevating obscure and unique events to take their place right next to standard popular leagues.
* **The "Daisy Chain" Engine:** A refined scheduling system that allows users to seamlessly link picks throughout a 48-hour window, encouraging daily engagement and community interaction.
* **Digital Cosmetics & Personalization:** A robust, closed-loop digital shop where users can spend their earned Links on profile rings, banners, and titles to flex their status on the leaderboards.

## ⚙️ Environment & Port Configuration

To support running both local development/AIStudio environments and Cloud Run/App Hosting production deployments simultaneously:

- **Server Port (`PORT`):** The application server dynamically checks `process.env.PORT`.
  - In Cloud Run / Firebase App Hosting container environments, Cloud Run passes `PORT=8080` (or similar environment-configured port). The container must expose and bind to `0.0.0.0:${PORT}` to pass health checks.
  - In AIStudio or local development (`npm run dev`), if `PORT` is not defined in the environment, the server defaults to port `3000`.
- **Preventing Deployment Port Failures:**
  - If Cloud Run throws a `generic::failed_precondition: The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable`, ensure that `server.ts` resolves `process.env.PORT` dynamically (`process.env.PORT ? parseInt(process.env.PORT, 10) : 3000`) and binds to host `0.0.0.0`.
  - Both `8080` and `3000` are exposed in `Dockerfile` and configured in CORS allowed origins (`http://localhost:3000`, `http://localhost:8080`) so local development and production container builds can run side-by-side without port conflicts or CORS issues.

- **Troubleshooting Firebase App Hosting & Cloud Build Timeouts (`deadline exceeded`):**
  - If a deployment fails with `checkBuildComplete build has taken longer than 1h0m0s to start and complete, marking as timed out: cloud build has taken longer than the polling timeout: deadline exceeded`:
    1. **Transient Cloud Build Stalls:** Cloud Build runner allocation or secret retrieval occasionally stalls in Firebase App Hosting. Triggering a re-run of the build or pushing a new commit will start a fresh build instance.
    2. **Secret Dependencies:** Ensure all secrets defined in `apphosting.yaml` (e.g., `VITE_FIREBASE_VAPID_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SCRIPTLESS_API_KEY`) exist in Secret Manager and the App Hosting service account has Secret Manager Secret Accessor permission.
    3. **Build Step Verification:** Local production builds run efficiently in ~20 seconds (`npm run build`). If a build hangs remotely, check the Cloud Build log details via GCP Console to identify if `npm ci` or asset bundling hung waiting for interactive input or network access.

## 🙏 Acknowledgements & Attribution

ChainLink 2.0 is an evolution of a concept that began in the open-source community.

We would like to give our deepest thanks and full attribution to the original creator, unmonk (https://github.com/unmonk), and the original chainlink project (https://github.com/unmonk/chainlink). Their foundational work and design inspired this next generation of the platform. By continuing this project, we honor their contribution and commit to keeping the core of ChainLink open and accessible.

## 🚨 Build Failure Analysis & Developer Guidelines

### 1. Summary of Incident
Deployment failed during the Docker image creation step (`RUN npm ci`).
**Error Message:**
```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: @tailwindcss/oxide-... from lock file
npm error Missing: @esbuild/... from lock file
```

### 2. Root Cause Analysis (RCA)
- **Manual / Out-of-Sync Package Changes:** Dependencies or `devDependencies` in `package.json` were updated or added, but `package-lock.json` was either not updated via `npm install` or was excluded from the git commit.
- **Strict Enforcement by npm ci:** The container build script (Dockerfile) uses `RUN npm ci` (which is standard practice for deterministic production builds). Unlike `npm install` (which updates `package-lock.json` on the fly), `npm ci` strictly fails if `package-lock.json` is missing dependencies present in `package.json` or if dependency versions do not align 100%.

### 3. How It Was Fixed
- **Synchronized Lockfile:** Executed `npm install` locally to reconcile all missing platform bindings (`@esbuild`, `@tailwindcss/oxide`, `@rollup`, etc.) into `package-lock.json`.
- **Verified Clean Install:** Ran `npm ci` locally to confirm 100% lockfile alignment.
- **Validated Quality Checks:** Verified `npm run build`, `npm run lint`, and `npx vitest run` pass cleanly.
- **Committed Changes:** Pushed the updated `package-lock.json` alongside updated developer documentation in `README.md`.

### 4. Developer Guidelines ("What NOT To Do")
- ❌ **DO NOT edit package.json manually without updating package-lock.json.**
  If you manually add or edit a dependency version in `package.json`, you must run `npm install` afterwards to regenerate the lockfile.
- ❌ **DO NOT commit package.json alone.**
  Always stage and commit both `package.json` AND `package-lock.json` in the same commit.
- ❌ **DO NOT use npm install <package> with --no-save or bypass lockfiles in CI.**
  Do not attempt to bypass `npm ci` by changing the Dockerfile to `npm install` in production. `npm ci` ensures reproducible builds and prevents unintended package version drifts.

### 5. Pre-Push Checklist for Developers
Before pushing code or opening a PR:
1. **Run npm ci locally:** `npm ci` (If it fails, run `npm install` to sync your lockfile, then re-test `npm ci`).
2. **Run full verification suite:** `npm run build && npm run lint && npx vitest run`
3. **Check git status:** Ensure both `package.json` and `package-lock.json` are included in your commit if dependencies were modified.
