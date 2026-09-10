import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteProblemRepository } from '../infrastructure/sqlite-problem-repository.js';
import { SqliteAttemptRepository } from '../infrastructure/sqlite-attempt-repository.js';
import { RelationshipIntegrityRule } from '../domain/rules/relationship-integrity.rule.js';
import { ClassSizeAndCohesionRule } from '../domain/rules/class-size-cohesion.rule.js';
import { CouplingMetricsRule } from '../domain/rules/coupling-metrics.rule.js';
import { RequirementsCoverageRule } from '../domain/rules/requirements-coverage.rule.js';
import { SolidPrinciplesRule } from '../domain/rules/solid-principles.rule.js';
import { MockSemanticEvaluator } from '../domain/evaluators/mock-semantic-evaluator.js';
import { EvaluationPipeline } from '../domain/pipeline/evaluation-pipeline.js';
import { UseCases } from '../domain/use-cases.js';
import { SEED_PROBLEMS } from '../infrastructure/seed-problems.js';

describe('Attempt Lifecycle & State Machine', () => {
  let db: Database.Database;
  let useCases: UseCases;

  beforeEach(() => {
    // In-memory test database
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

    // Seed test problem
    const p = SEED_PROBLEMS[0];
    db.prepare(`
      INSERT INTO problems VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      p.id, p.slug, p.title, p.difficulty, p.estimatedMinutes, p.scenario,
      JSON.stringify(p.functionalRequirements), JSON.stringify(p.nonFunctionalRequirements),
      JSON.stringify(p.constraints), JSON.stringify(p.useCases), JSON.stringify(p.evaluationCriteria),
      JSON.stringify(p.starterTemplate), JSON.stringify(p.domainRubric)
    );

    const problemRepo = new SqliteProblemRepository(db);
    const attemptRepo = new SqliteAttemptRepository(db);
    const rules = [
      new RequirementsCoverageRule(),
      new ClassSizeAndCohesionRule(),
      new CouplingMetricsRule(),
      new RelationshipIntegrityRule(),
      new SolidPrinciplesRule()
    ];
    const semanticEvaluator = new MockSemanticEvaluator();
    const pipeline = new EvaluationPipeline(rules, semanticEvaluator);

    useCases = new UseCases(problemRepo, attemptRepo, pipeline);
  });

  it('creates an attempt in DRAFT status with starter template', async () => {
    const attempt = await useCases.createAttempt('parking-lot-system');
    expect(attempt.id).toBeDefined();
    expect(attempt.attemptNumber).toBe(1);
    expect(attempt.status).toBe('DRAFT');
    expect(attempt.submittedSnapshot).toBeNull();
    expect(attempt.evaluation).toBeNull();
    expect(attempt.draftDesign.classes.length).toBeGreaterThan(0);
  });

  it('allows saving and updating draft design while in DRAFT', async () => {
    const attempt = await useCases.createAttempt('parking-lot-system');
    const modifiedDesign = {
      ...attempt.draftDesign,
      classes: [
        ...attempt.draftDesign.classes,
        {
          id: 'c-custom',
          name: 'FeeCalculator',
          responsibility: 'Calculates parking fees based on duration and spot tier',
          attributes: [],
          methods: [{ name: 'computeFee', returnType: 'number', parameters: 'hours: number' }]
        }
      ]
    };

    const updated = await useCases.saveDraft(attempt.id, modifiedDesign);
    expect(updated.draftDesign.classes.some((c) => c.name === 'FeeCalculator')).toBe(true);
  });

  it('freezes an immutable submitted snapshot on submit and transitions to EVALUATED', async () => {
    const attempt = await useCases.createAttempt('parking-lot-system');
    const evaluatedAttempt = await useCases.submitAttempt(attempt.id);

    expect(evaluatedAttempt.status).toBe('EVALUATED');
    expect(evaluatedAttempt.submittedSnapshot).not.toBeNull();
    expect(evaluatedAttempt.submittedSnapshot?.design).toBeDefined();
    expect(evaluatedAttempt.evaluation).not.toBeNull();
    expect(evaluatedAttempt.evaluation?.overallScore).toBeGreaterThan(0);
    expect(evaluatedAttempt.submittedAt).not.toBeNull();
  });

  it('rejects saving a draft after an attempt has been submitted', async () => {
    const attempt = await useCases.createAttempt('parking-lot-system');
    await useCases.submitAttempt(attempt.id);

    await expect(
      useCases.saveDraft(attempt.id, {
        classes: [],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      })
    ).rejects.toThrow(/Attempt is in status/);
  });

  it('rejects resubmitting an already evaluated attempt', async () => {
    const attempt = await useCases.createAttempt('parking-lot-system');
    await useCases.submitAttempt(attempt.id);

    await expect(useCases.submitAttempt(attempt.id)).rejects.toThrow(/Already submitted or evaluated/);
  });

  it('creates Attempt #2 when retrying, preserving Attempt #1 intact', async () => {
    const attempt1 = await useCases.createAttempt('parking-lot-system');
    await useCases.submitAttempt(attempt1.id);

    // Fork to attempt 2
    const attempt2 = await useCases.createAttempt('parking-lot-system', attempt1.id);
    expect(attempt2.attemptNumber).toBe(2);
    expect(attempt2.status).toBe('DRAFT');
    expect(attempt2.id).not.toBe(attempt1.id);

    // Verify attempt 1 was unchanged
    const fetchedAttempt1 = await useCases.getAttempt(attempt1.id);
    expect(fetchedAttempt1?.status).toBe('EVALUATED');
    expect(fetchedAttempt1?.attemptNumber).toBe(1);
  });
});
