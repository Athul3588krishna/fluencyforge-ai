import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db/store';
import { authRouter } from './server/routes/auth';
import { chatRouter } from './server/routes/chat';
import { learningRouter } from './server/routes/learning';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  const dbStatus = await initDatabase();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: dbStatus.mode,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/learning', learningRouter);
  app.use('/api/chat', chatRouter);

  if (process.env.NODE_ENV !== 'production') {
    const hmrEnabled = process.env.DISABLE_HMR !== 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled ? { server: httpServer } : false,
        ws: hmrEnabled ? undefined : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FluencyForge AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FluencyForge AI server:', err);
  process.exit(1);
});
