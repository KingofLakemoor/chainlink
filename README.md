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

## 🙏 Acknowledgements & Attribution

ChainLink 2.0 is an evolution of a concept that began in the open-source community.

We would like to give our deepest thanks and full attribution to the original creator, unmonk (https://github.com/unmonk), and the original chainlink project (https://github.com/unmonk/chainlink). Their foundational work and design inspired this next generation of the platform. By continuing this project, we honor their contribution and commit to keeping the core of ChainLink open and accessible.
