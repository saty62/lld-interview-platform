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

describe('Attempt Comparison & Improvement Tracking', () => {
  let db: Database.Database;
  let useCases: UseCases;

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

    const problemRepo = new SqliteProblemRepository(db);
    const attemptRepo = new SqliteAttemptRepository(db);
    const rules = [
      new RequirementsCoverageRule(),
      new ClassSizeAndCohesionRule(),
      new CouplingMetricsRule(),
      new RelationshipIntegrityRule(),
      new SolidPrinciplesRule()
    ];
    const pipeline = new EvaluationPipeline(rules, new MockSemanticEvaluator());
    useCases = new UseCases(problemRepo, attemptRepo, pipeline);
  });

  it('computes improvement diff between Attempt 1 and Attempt 2', async () => {
    // Attempt 1: Minimal starter design
    const attempt1 = await useCases.createAttempt('parking-lot-system');
    const evaluated1 = await useCases.submitAttempt(attempt1.id);

    // Attempt 2: Improved design with decoupled fee strategy and interfaces
    const attempt2 = await useCases.createAttempt('parking-lot-system', attempt1.id);
    const improvedDesign = {
      ...attempt2.draftDesign,
      classes: [
        ...attempt2.draftDesign.classes,
        {
          id: 'c-fee',
          name: 'FlatRateFeePolicy',
          responsibility: 'Computes flat parking fee per duration hours',
          attributes: [],
          methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'hours: number' }]
        }
      ],
      interfaces: [
        {
          id: 'i-fee',
          name: 'IFeePolicy',
          responsibility: 'Contract for computing parking fees',
          methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'hours: number' }]
        }
      ],
      relationships: [
        ...attempt2.draftDesign.relationships,
        {
          id: 'r-fee-impl',
          source: 'FlatRateFeePolicy',
          target: 'IFeePolicy',
          type: 'IMPLEMENTATION' as const
        }
      ],
      patternsApplied: [
        { pattern: 'Strategy Pattern', appliedTo: ['IFeePolicy'], justification: 'Decouple fee pricing from gates' }
      ],
      tradeoffs: 'Decoupled pricing policies behind interface to avoid modifying gate classes.',
      extensibilityExplanation: 'Can introduce surge pricing or free parking with new IFeePolicy implementations.'
    };

    await useCases.saveDraft(attempt2.id, improvedDesign);
    const evaluated2 = await useCases.submitAttempt(attempt2.id);

    // Compare Attempt 1 vs Attempt 2
    const comparison = await useCases.compareAttempts(evaluated1.id, evaluated2.id);
    expect(comparison.baseAttemptNumber).toBe(1);
    expect(comparison.targetAttemptNumber).toBe(2);
    expect(comparison.scoreDiff).toBeGreaterThanOrEqual(0);
    expect(comparison.improvements.length).toBeGreaterThan(0);
    expect(comparison.improvements.some((imp) => imp.includes('interface'))).toBe(true);
    expect(comparison.improvements.some((imp) => imp.includes('pattern'))).toBe(true);
  });
});
