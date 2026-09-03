# AI Studio Environment & Full-Stack Deployment Architecture

**CRITICAL GUIDELINES FOR THE AGENT**:

This project uses a specific full-stack architecture (Express + Vite) required to function properly both in the Google AI Studio container environment and when exported to external hosting (like GitHub/Cloud Run).

When making architectural changes, adding features, or preparing the repo for export/publish, you MUST adhere strictly to the following rules to prevent breaking the deployment setup:

## 1. Dynamic Port Architecture (process.env.PORT || 3000)
- The application runs in different environments. AI Studio requires port `3000`, while Cloud Deployments (like Cloud Run) inject their own port via the `PORT` environment variable (usually `8080`).
- The Express server (`server.ts`) MUST dynamically bind to `process.env.PORT || 3000` and listen on host `0.0.0.0`. 
- **DO NOT** hardcode the port strictly to `3000`, as this will break cloud deployments.
- **DO NOT** configure separate ports for the frontend dev server and the backend API. It must be a single unified server.

## 2. Server Entry Point (`server.ts`)
- All backend routes (`/api/*`) MUST be registered on the Express app.
- Vite is mounted as a middleware for development ONLY (`process.env.NODE_ENV !== "production"`).
- In production (after build), Express serves the static files from `dist/` and falls back to `dist/index.html` for client-side routing.
- Do NOT remove or modify this middleware logic.

## 3. Package Scripts (`package.json`)
The scripts in `package.json` are precisely calibrated to support both local development and production container builds. 
- `"dev"`: Runs the server using `tsx server.ts`.
- `"build"`: Compiles the service worker, runs `vite build`, and uses `esbuild` to compile `server.ts` into a CommonJS bundle (`dist/server.cjs`).
- `"start"`: Runs `node dist/server.cjs`.
- **NEVER** separate these into `"build:client"` and `"build:server"` without ensuring that `npm run build` seamlessly performs both.

## 4. GitHub Export & Deployment
When modifying configuration files (like `vite.config.ts`, `server.ts`, or `package.json`) in preparation for a GitHub export or external deployment:
- Ensure you do NOT accidentally override the `NODE_ENV=production` logic in `server.ts`.
- Ensure all API keys are still accessed server-side (via `process.env`) and NEVER prefixed with `VITE_` unless strictly required on the client side.
- Do not introduce commands that expect parallel terminal windows (like `concurrently`). The single `node dist/server.cjs` process is mandatory for production.
