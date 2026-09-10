import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteProblemRepository } from '../infrastructure/sqlite-problem-repository.js';
import { SqliteAttemptRepository } from '../infrastructure/sqlite-attempt-repository.js';
import { EvaluationPipeline } from '../domain/pipeline/evaluation-pipeline.js';
import { UseCases } from '../domain/use-cases.js';
import { SEED_PROBLEMS } from '../infrastructure/seed-problems.js';
import { EvaluationRule } from '../domain/evaluation-rule.interface.js';
import { MockSemanticEvaluator } from '../domain/evaluators/mock-semantic-evaluator.js';

describe('Failure Handling & Evaluation Recovery', () => {
  let db: Database.Database;
  let attemptRepo: SqliteAttemptRepository;
  let problemRepo: SqliteProblemRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE problems (
        id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
        difficulty TEXT NOT NULL, estimated_minutes INTEGER NOT NULL, scenario TEXT NOT NULL,
        functional_requirements TEXT NOT NULL, non_functional_requirements TEXT NOT NULL,
        constraints TEXT NOT NULL, use_cases TEXT NOT NULL, evaluation_criteria TEXT NOT NULL,
        starter_template TEXT NOT NULL, domain_rubric TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE attempts (
        id TEXT PRIMARY KEY, problem_id TEXT NOT NULL, attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL, draft_design TEXT NOT NULL, submitted_snapshot TEXT,
        failure_reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, submitted_at DATETIME
      );
      CREATE TABLE evaluations (
        id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL UNIQUE, overall_score REAL NOT NULL,
        qualitative_level TEXT NOT NULL, deterministic_score REAL NOT NULL, semantic_score REAL NOT NULL,
        evaluator_type TEXT NOT NULL, score_dimensions TEXT NOT NULL, rule_results TEXT NOT NULL,
        feedback_items TEXT NOT NULL, strengths TEXT NOT NULL, areas_for_improvement TEXT NOT NULL,
        tradeoff_critique TEXT NOT NULL, alternative_designs TEXT NOT NULL,
        execution_duration_ms INTEGER NOT NULL, evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const p = SEED_PROBLEMS[0];
    db.prepare(`INSERT INTO problems VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(
      p.id, p.slug, p.title, p.difficulty, p.estimatedMinutes, p.scenario,
      JSON.stringify(p.functionalRequirements), JSON.stringify(p.nonFunctionalRequirements),
      JSON.stringify(p.constraints), JSON.stringify(p.useCases), JSON.stringify(p.evaluationCriteria),
      JSON.stringify(p.starterTemplate), JSON.stringify(p.domainRubric)
    );

    problemRepo = new SqliteProblemRepository(db);
    attemptRepo = new SqliteAttemptRepository(db);
  });

  it('preserves snapshot and transitions to EVALUATION_FAILED on unhandled pipeline error', async () => {
    // Failing pipeline rule
    const faultyRule: EvaluationRule = {
      id: 'faulty-rule',
      name: 'Faulty Rule',
      category: 'STRUCTURAL_INTEGRITY',
      maxScore: 20,
      evaluate: async () => {
        throw new Error('Fatal rule engine error simulation');
      }
    };

    // Construct pipeline with broken semantic evaluator
    const brokenSemanticEvaluator = {
      name: 'Broken',
      type: 'HYBRID_MOCK' as const,
      evaluate: async () => {
        throw new Error('Network crash simulation in semantic evaluator');
      }
    };

    const pipeline = new EvaluationPipeline([faultyRule], brokenSemanticEvaluator);
    const useCases = new UseCases(problemRepo, attemptRepo, pipeline);

    const attempt = await useCases.createAttempt('parking-lot-system');
    const failedAttempt = await useCases.submitAttempt(attempt.id);

    // Verify submission snapshot was NOT lost
    expect(failedAttempt.status).toBe('EVALUATION_FAILED');
    expect(failedAttempt.failureReason).toContain('Network crash simulation');
    expect(failedAttempt.submittedSnapshot).not.toBeNull();
    expect(failedAttempt.submittedSnapshot?.design.classes.length).toBeGreaterThan(0);
  });

  it('allows retrying a failed evaluation once pipeline service is restored', async () => {
    let shouldFail = true;
    const flappySemanticEvaluator = {
      name: 'Flappy',
      type: 'HYBRID_MOCK' as const,
      evaluate: async (ctx: any, results: any) => {
        if (shouldFail) {
          throw new Error('Transient 503 Service Unavailable');
        }
        return new MockSemanticEvaluator().evaluate(ctx, results);
      }
    };

    const pipeline = new EvaluationPipeline([], flappySemanticEvaluator);
    const useCases = new UseCases(problemRepo, attemptRepo, pipeline);

    const attempt = await useCases.createAttempt('parking-lot-system');
    const failedAttempt = await useCases.submitAttempt(attempt.id);
    expect(failedAttempt.status).toBe('EVALUATION_FAILED');

    // Service recovers
    shouldFail = false;
    const recoveredAttempt = await useCases.retryEvaluation(failedAttempt.id);

    expect(recoveredAttempt.status).toBe('EVALUATED');
    expect(recoveredAttempt.evaluation).not.toBeNull();
    expect(recoveredAttempt.failureReason).toBeUndefined();
  });
});
