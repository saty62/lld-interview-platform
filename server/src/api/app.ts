import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createRouter } from './routes.js';
import { UseCases } from '../domain/use-cases.js';

export function createApp(useCases: UseCases): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  const router = createRouter(useCases);
  app.use('/api', router);

  // Serve static frontend in production if built
  const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.use((_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}
