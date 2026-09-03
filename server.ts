import fs from 'fs';
import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import { initializeApp, cert } from 'firebase-admin/app';
import { apiRouter } from './src/apiRouter.js';
import { startNotificationListener } from './src/services/notificationProcessor.js';
import { startMonthlyRolloverJob } from './src/services/monthlyRollover.js';
import { startAutoSyncJob } from './src/services/autoSync.js';
import { startPickemRemindersJob } from './src/services/pickemReminders.js';
import { startPickemEnforcerJob } from './src/services/pickemEnforcer.js';

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod" || (process.argv[1] && (process.argv[1].endsWith("server.cjs") || process.argv[1].includes("dist")));
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://chainlink-2-72590.firebaseapp.com',
    'https://chainlink.club602.com',
    'https://ChainLink.club602.com',
    'https://www.chainlink.club602.com',
    'https://www.ChainLink.club602.com'
  ];
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  }));
  app.use(compression());
  app.use(cors({ origin: allowedOrigins }));

  // Proxy /__/auth/* requests to the default Firebase auth domain to support custom and preview domains
  let defaultAuthDomain = '';
  try {
    const fs = await import('fs');
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      defaultAuthDomain = config.authDomain || `${config.projectId}.firebaseapp.com`;
    }
  } catch (e) {
    console.error('Failed to read default authDomain for proxy:', e);
  }

  // Use raw body parser for auth proxy to preserve any custom content types / bodies
  app.use('/__/auth/*', express.raw({ type: '*/*', limit: '10mb' }));

  app.all('/__/auth/*', async (req, res) => {
    try {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
      const inferredAuthDomain = projectId ? `${projectId}.firebaseapp.com` : '';
      const targetDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || inferredAuthDomain || defaultAuthDomain || 'gen-lang-client-0142543934.firebaseapp.com';
      const targetUrl = `https://${targetDomain}${req.originalUrl}`;
      
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.origin;
      delete headers.referer;
      
      // Remove hop-by-hop and connection headers to avoid undici/fetch errors
      const hopByHopHeaders = [
        'connection',
        'keep-alive',
        'transfer-encoding',
        'te',
        'upgrade',
        'proxy-authorization',
        'proxy-connection'
      ];
      for (const h of hopByHopHeaders) {
        delete headers[h];
      }
      
      const options: any = {
        method: req.method,
        headers: headers as Record<string, string>,
      };
      
      if (req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length > 0) {
        options.body = req.body;
      }
      
      const response = await fetch(targetUrl, options);
      
      // Set headers from target back to client
      response.headers.forEach((value, key) => {
        if (['content-encoding', 'transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) return;
        res.setHeader(key, value);
      });
      
      res.status(response.status);
      
      // Send binary or text body
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('Error proxying Firebase Auth request:', err);
      res.status(502).send('Bad Gateway');
    }
  });

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
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || config.projectId,
        appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || config.appId,
        apiKey: (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || config.apiKey || '').trim(),
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || config.authDomain,
        firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || config.firestoreDatabaseId,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || config.storageBucket,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || config.measurementId || ''
      });
    } catch (e) {
      console.error('Error serving init.json:', e);
      res.json({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '',
        appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
        apiKey: (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '').trim(),
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
        firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || '',
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || ''
      });
    }
  });

  // Version Endpoint for client update checks
  const buildTimestamp = (() => {
    try {
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        return new Date(fs.statSync(indexPath).mtimeMs).toISOString();
      }
    } catch (e) {}
    return new Date().toISOString();
  })();

  const handleVersionRequest = (req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ version: process.env.BUILD_VERSION || buildTimestamp, timestamp: Date.now() });
  };

  app.get('/api/version', handleVersionRequest);
  app.get('/version.json', handleVersionRequest);

  
  app.use('/api', apiRouter);

  // Catch-all 404 handler specifically for /api routes to prevent Vite fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Not Found' });
  });

  const noCacheRoutes = ['/sw.js', '/manifest.json', '/index.html'];

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    noCacheRoutes.forEach(route => {
      app.get(route, (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        next();
      });
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    app.get('/sw.js', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'sw.js'));
    });

    app.get('/manifest.json', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'manifest.json'));
    });

    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html') || filePath.endsWith('manifest.json') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
      }
    }));

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    startNotificationListener();
    startMonthlyRolloverJob();
    startAutoSyncJob();
    startPickemRemindersJob();
    startPickemEnforcerJob();
  });

  const SECONDARY_PORT = PORT === 8080 ? 3000 : (PORT === 3000 ? 8080 : null);
  if (SECONDARY_PORT && SECONDARY_PORT !== PORT) {
    try {
      const secondaryServer = app.listen(SECONDARY_PORT, "0.0.0.0", () => {
        console.log(`Secondary server listener running on http://0.0.0.0:${SECONDARY_PORT}`);
      });
      secondaryServer.on('error', (err: any) => {
        console.warn(`Secondary port ${SECONDARY_PORT} listener skipped (${err.message})`);
      });
    } catch (e: any) {
      console.warn(`Failed to bind secondary port ${SECONDARY_PORT}:`, e?.message || e);
    }
  }
}

startServer();
