import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SEED_PROBLEMS } from './seed-problems.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'lld_arena.db');

export function initDatabase(): Database.Database {
  const db = new Database(DB_PATH);

  // Enable WAL mode for high concurrency and write safety
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      scenario TEXT NOT NULL,
      functional_requirements TEXT NOT NULL,
      non_functional_requirements TEXT NOT NULL,
      constraints TEXT NOT NULL,
      use_cases TEXT NOT NULL,
      evaluation_criteria TEXT NOT NULL,
      starter_template TEXT NOT NULL,
      domain_rubric TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      draft_design TEXT NOT NULL,
      submitted_snapshot TEXT,
      failure_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      FOREIGN KEY (problem_id) REFERENCES problems(id)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL UNIQUE,
      overall_score REAL NOT NULL,
      qualitative_level TEXT NOT NULL,
      deterministic_score REAL NOT NULL,
      semantic_score REAL NOT NULL,
      evaluator_type TEXT NOT NULL,
      score_dimensions TEXT NOT NULL,
      rule_results TEXT NOT NULL,
      feedback_items TEXT NOT NULL,
      strengths TEXT NOT NULL,
      areas_for_improvement TEXT NOT NULL,
      tradeoff_critique TEXT NOT NULL,
      alternative_designs TEXT NOT NULL,
      execution_duration_ms INTEGER NOT NULL,
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_problem_id ON attempts(problem_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_attempt_id ON evaluations(attempt_id);
  `);

  // Seed problems if none exist
  const countRow = db.prepare('SELECT COUNT(*) as count FROM problems').get() as { count: number };
  if (countRow.count === 0) {
    const insertProblem = db.prepare(`
      INSERT INTO problems (
        id, slug, title, difficulty, estimated_minutes, scenario,
        functional_requirements, non_functional_requirements, constraints,
        use_cases, evaluation_criteria, starter_template, domain_rubric
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((problems) => {
      for (const p of problems) {
        insertProblem.run(
          p.id,
          p.slug,
          p.title,
          p.difficulty,
          p.estimatedMinutes,
          p.scenario,
          JSON.stringify(p.functionalRequirements),
          JSON.stringify(p.nonFunctionalRequirements),
          JSON.stringify(p.constraints),
          JSON.stringify(p.useCases),
          JSON.stringify(p.evaluationCriteria),
          JSON.stringify(p.starterTemplate),
          JSON.stringify(p.domainRubric)
        );
      }
    });

    insertMany(SEED_PROBLEMS);
    console.log(`[Database] Successfully seeded ${SEED_PROBLEMS.length} LLD problems.`);
  }

  return db;
}
