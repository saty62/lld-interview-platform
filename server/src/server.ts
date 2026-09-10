import dotenv from 'dotenv';
dotenv.config();

import { initDatabase } from './infrastructure/database.js';
import { SqliteProblemRepository } from './infrastructure/sqlite-problem-repository.js';
import { SqliteAttemptRepository } from './infrastructure/sqlite-attempt-repository.js';
import { RelationshipIntegrityRule } from './domain/rules/relationship-integrity.rule.js';
import { ClassSizeAndCohesionRule } from './domain/rules/class-size-cohesion.rule.js';
import { CouplingMetricsRule } from './domain/rules/coupling-metrics.rule.js';
import { RequirementsCoverageRule } from './domain/rules/requirements-coverage.rule.js';
import { SolidPrinciplesRule } from './domain/rules/solid-principles.rule.js';
import { MockSemanticEvaluator } from './domain/evaluators/mock-semantic-evaluator.js';
import { LLMSemanticEvaluator } from './domain/evaluators/llm-semantic-evaluator.js';
import { EvaluationPipeline } from './domain/pipeline/evaluation-pipeline.js';
import { UseCases } from './domain/use-cases.js';
import { createApp } from './api/app.js';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('⚡ Starting LLD Arena Backend Services...');
  console.log('--------------------------------------------------');

  const db = initDatabase();
  const problemRepo = new SqliteProblemRepository(db);
  const attemptRepo = new SqliteAttemptRepository(db);

  // Deterministic evaluation rules
  const rules = [
    new RequirementsCoverageRule(),
    new ClassSizeAndCohesionRule(),
    new CouplingMetricsRule(),
    new RelationshipIntegrityRule(),
    new SolidPrinciplesRule()
  ];

  // Pluggable semantic evaluator: LLM with automatic Mock fallback
  const semanticEvaluator = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
    ? new LLMSemanticEvaluator()
    : new MockSemanticEvaluator();

  console.log(`[Architecture] Active Semantic Evaluator: ${semanticEvaluator.name} (${semanticEvaluator.type})`);

  const pipeline = new EvaluationPipeline(rules, semanticEvaluator);
  const useCases = new UseCases(problemRepo, attemptRepo, pipeline);
  const app = createApp(useCases);

  const server = app.listen(PORT, () => {
    console.log(`🚀 LLD Arena Server running at http://localhost:${PORT}`);
    console.log(`📡 REST API active on http://localhost:${PORT}/api/problems`);
  });

  const shutdown = () => {
    console.log('\nGracefully shutting down...');
    server.close(() => {
      db.close();
      console.log('Database connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
