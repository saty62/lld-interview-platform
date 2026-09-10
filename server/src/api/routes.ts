import { Router, Request, Response } from 'express';
import { UseCases } from '../domain/use-cases.js';

export function createRouter(useCases: UseCases): Router {
  const router = Router();

  // Healthcheck
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Problems
  router.get('/problems', async (_req: Request, res: Response) => {
    try {
      const problems = await useCases.listProblems();
      res.json(problems);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/problems/:slug', async (req: Request, res: Response) => {
    try {
      const problem = await useCases.getProblemBySlug(req.params.slug);
      if (!problem) {
        res.status(404).json({ error: 'Problem not found' });
        return;
      }
      res.json(problem);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Attempts
  router.post('/problems/:slug/attempts', async (req: Request, res: Response) => {
    try {
      const { forkFromAttemptId } = req.body || {};
      const attempt = await useCases.createAttempt(req.params.slug, forkFromAttemptId);
      res.status(201).json(attempt);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/problems/:slug/attempts', async (req: Request, res: Response) => {
    try {
      const history = await useCases.getAttemptHistory(req.params.slug);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/attempts/recent', async (_req: Request, res: Response) => {
    try {
      const recents = await useCases.getRecentAttempts();
      res.json(recents);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/attempts/compare', async (req: Request, res: Response) => {
    try {
      const { baseId, targetId } = req.query;
      if (!baseId || !targetId) {
        res.status(400).json({ error: 'baseId and targetId query parameters are required.' });
        return;
      }
      const comparison = await useCases.compareAttempts(String(baseId), String(targetId));
      res.json(comparison);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/attempts/:id', async (req: Request, res: Response) => {
    try {
      const attempt = await useCases.getAttempt(req.params.id);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }
      res.json(attempt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/attempts/:id/draft', async (req: Request, res: Response) => {
    try {
      const { design } = req.body;
      if (!design) {
        res.status(400).json({ error: 'Missing design payload in body.' });
        return;
      }
      const updated = await useCases.saveDraft(req.params.id, design);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/attempts/:id/submit', async (req: Request, res: Response) => {
    try {
      const evaluatedAttempt = await useCases.submitAttempt(req.params.id);
      res.json(evaluatedAttempt);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/attempts/:id/retry', async (req: Request, res: Response) => {
    try {
      const retryResult = await useCases.retryEvaluation(req.params.id);
      res.json(retryResult);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
