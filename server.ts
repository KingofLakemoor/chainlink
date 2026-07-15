import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { initializeApp, cert } from 'firebase-admin/app';
import { apiRouter } from './src/apiRouter.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  const allowedOrigins = [
    'http://localhost:3000',
    'https://chainlink-2-72590.firebaseapp.com',
    'https://chainlink.club602.com',
    'https://ChainLink.club602.com',
    'https://www.chainlink.club602.com',
    'https://www.ChainLink.club602.com'
  ];
  app.use(cors({ origin: allowedOrigins }));

  // We need the raw body for the webhook endpoint to verify the Stripe signature
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  

  // Global middleware to set Cross-Origin-Opener-Policy
  app.use((req, res, next) => {
    
    next();
  });

  // Dynamic Firebase config endpoint
  app.get('/__/firebase/init.json', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const configStr = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configStr);
      res.json({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || config.projectId,
        appId: process.env.VITE_FIREBASE_APP_ID || config.appId,
        apiKey: (process.env.VITE_FIREBASE_API_KEY || config.apiKey || '').trim(),
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
        firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || config.firestoreDatabaseId,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId || ''
      });
    } catch (e) {
      console.error('Error serving init.json:', e);
      res.json({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
        appId: process.env.VITE_FIREBASE_APP_ID || '',
        apiKey: (process.env.VITE_FIREBASE_API_KEY || '').trim(),
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || ''
      });
    }
  });

  app.use('/api', apiRouter);

  // Catch-all 404 handler specifically for /api routes to prevent Vite fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Not Found' });
  });

  const isProduction = process.env.NODE_ENV === "production" || 
                       process.env.NODE_ENV === "prod" ||
                       (process.argv[1] && (process.argv[1].endsWith('server.cjs') || process.argv[1].includes('dist')));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.get('/sw.js', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Clear-Site-Data', '"cache"');
      res.sendFile(path.join(process.cwd(), 'public/sw.js'));
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.get("/sw.js", (req, res) => { res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"); res.setHeader("Clear-Site-Data", "\"cache\""); res.sendFile(path.join(distPath, "sw.js")); });
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
