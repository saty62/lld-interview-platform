import Database from 'better-sqlite3';
import { AttemptRepository } from '../domain/repositories.js';
import { Attempt, AttemptSummary, Evaluation, Design } from '../../shared/types.js';

export class SqliteAttemptRepository implements AttemptRepository {
  constructor(private db: Database.Database) {}

  private mapRowToAttempt(row: any, evalRow?: any): Attempt {
    let evaluation: Evaluation | null = null;
    if (evalRow) {
      evaluation = {
        id: evalRow.id,
        attemptId: evalRow.attempt_id,
        overallScore: evalRow.overall_score,
        qualitativeLevel: evalRow.qualitative_level,
        deterministicScore: evalRow.deterministic_score,
        semanticScore: evalRow.semantic_score,
        evaluatorType: evalRow.evaluator_type,
        scoreDimensions: JSON.parse(evalRow.score_dimensions),
        ruleResults: JSON.parse(evalRow.rule_results),
        feedbackItems: JSON.parse(evalRow.feedback_items),
        strengths: JSON.parse(evalRow.strengths),
        areasForImprovement: JSON.parse(evalRow.areas_for_improvement),
        tradeoffCritique: evalRow.tradeoff_critique,
        alternativeDesigns: JSON.parse(evalRow.alternative_designs),
        executionDurationMs: evalRow.execution_duration_ms,
        evaluatedAt: evalRow.evaluated_at
      };
    }

    return {
      id: row.id,
      problemId: row.problem_id,
      attemptNumber: row.attempt_number,
      status: row.status,
      draftDesign: JSON.parse(row.draft_design),
      submittedSnapshot: row.submitted_snapshot ? JSON.parse(row.submitted_snapshot) : null,
      evaluation,
      failureReason: row.failure_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      submittedAt: row.submitted_at || null
    };
  }

  async create(attempt: Attempt): Promise<Attempt> {
    const stmt = this.db.prepare(`
      INSERT INTO attempts (
        id, problem_id, attempt_number, status, draft_design,
        submitted_snapshot, failure_reason, created_at, updated_at, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      attempt.id,
      attempt.problemId,
      attempt.attemptNumber,
      attempt.status,
      JSON.stringify(attempt.draftDesign),
      attempt.submittedSnapshot ? JSON.stringify(attempt.submittedSnapshot) : null,
      attempt.failureReason || null,
      attempt.createdAt,
      attempt.updatedAt,
      attempt.submittedAt || null
    );

    return attempt;
  }

  async findById(id: string): Promise<Attempt | null> {
    const attemptRow = this.db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as any;
    if (!attemptRow) return null;

    const evalRow = this.db.prepare('SELECT * FROM evaluations WHERE attempt_id = ?').get(id) as any;
    return this.mapRowToAttempt(attemptRow, evalRow);
  }

  async findByProblemId(problemId: string): Promise<Attempt[]> {
    const attemptRows = this.db.prepare('SELECT * FROM attempts WHERE problem_id = ? ORDER BY attempt_number DESC').all(problemId) as any[];
    return attemptRows.map((aRow) => {
      const evalRow = this.db.prepare('SELECT * FROM evaluations WHERE attempt_id = ?').get(aRow.id) as any;
      return this.mapRowToAttempt(aRow, evalRow);
    });
  }

  async findSummariesByProblemId(problemId: string): Promise<AttemptSummary[]> {
    const stmt = this.db.prepare(`
      SELECT 
        a.id, a.problem_id, a.attempt_number, a.status, a.draft_design,
        a.submitted_snapshot, a.created_at, a.updated_at, a.submitted_at,
        p.title as problem_title, p.slug as problem_slug,
        e.overall_score, e.qualitative_level
      FROM attempts a
      JOIN problems p ON a.problem_id = p.id
      LEFT JOIN evaluations e ON a.id = e.attempt_id
      WHERE a.problem_id = ?
      ORDER BY a.attempt_number DESC
    `);

    const rows = stmt.all(problemId) as any[];
    return rows.map((r) => {
      const designJson = r.submitted_snapshot || r.draft_design;
      let classCount = 0;
      let interfaceCount = 0;
      try {
        const parsed = JSON.parse(designJson);
        classCount = parsed.classes?.length || 0;
        interfaceCount = parsed.interfaces?.length || 0;
      } catch (e) {
        // fallback
      }

      return {
        id: r.id,
        problemId: r.problem_id,
        problemSlug: r.problem_slug,
        problemTitle: r.problem_title,
        attemptNumber: r.attempt_number,
        status: r.status,
        overallScore: r.overall_score !== null ? r.overall_score : undefined,
        qualitativeLevel: r.qualitative_level || undefined,
        submittedAt: r.submitted_at || undefined,
        updatedAt: r.updated_at,
        classCount,
        interfaceCount
      };
    });
  }

  async findRecentSummaries(): Promise<AttemptSummary[]> {
    const stmt = this.db.prepare(`
      SELECT 
        a.id, a.problem_id, a.attempt_number, a.status, a.draft_design,
        a.submitted_snapshot, a.created_at, a.updated_at, a.submitted_at,
        p.title as problem_title, p.slug as problem_slug,
        e.overall_score, e.qualitative_level
      FROM attempts a
      JOIN problems p ON a.problem_id = p.id
      LEFT JOIN evaluations e ON a.id = e.attempt_id
      ORDER BY a.updated_at DESC
      LIMIT 20
    `);

    const rows = stmt.all() as any[];
    return rows.map((r) => {
      const designJson = r.submitted_snapshot || r.draft_design;
      let classCount = 0;
      let interfaceCount = 0;
      try {
        const parsed = JSON.parse(designJson);
        classCount = parsed.classes?.length || 0;
        interfaceCount = parsed.interfaces?.length || 0;
      } catch (e) {
        // fallback
      }

      return {
        id: r.id,
        problemId: r.problem_id,
        problemSlug: r.problem_slug,
        problemTitle: r.problem_title,
        attemptNumber: r.attempt_number,
        status: r.status,
        overallScore: r.overall_score !== null ? r.overall_score : undefined,
        qualitativeLevel: r.qualitative_level || undefined,
        submittedAt: r.submitted_at || undefined,
        updatedAt: r.updated_at,
        classCount,
        interfaceCount
      };
    });
  }

  async updateDraft(id: string, design: Design): Promise<Attempt> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE attempts 
      SET draft_design = ?, updated_at = ?
      WHERE id = ? AND status = 'DRAFT'
    `);

    const res = stmt.run(JSON.stringify(design), now, id);
    if (res.changes === 0) {
      throw new Error(`Cannot update draft for attempt ${id}: Attempt not in DRAFT status or not found.`);
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Attempt ${id} not found after draft update.`);
    return updated;
  }

  async updateStatus(id: string, status: Attempt['status'], failureReason?: string): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE attempts 
      SET status = ?, failure_reason = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, failureReason || null, now, id);
  }

  async saveSubmissionSnapshot(id: string, snapshot: NonNullable<Attempt['submittedSnapshot']>): Promise<void> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE attempts 
      SET status = 'SUBMITTED', submitted_snapshot = ?, submitted_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(snapshot), snapshot.submittedAt, now, id);
  }

  async saveEvaluation(attemptId: string, evaluation: Evaluation): Promise<void> {
    const insertEval = this.db.prepare(`
      INSERT OR REPLACE INTO evaluations (
        id, attempt_id, overall_score, qualitative_level, deterministic_score,
        semantic_score, evaluator_type, score_dimensions, rule_results,
        feedback_items, strengths, areas_for_improvement, tradeoff_critique,
        alternative_designs, execution_duration_ms, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateAttempt = this.db.prepare(`
      UPDATE attempts 
      SET status = 'EVALUATED', updated_at = ?
      WHERE id = ?
    `);

    const tx = this.db.transaction(() => {
      insertEval.run(
        evaluation.id,
        attemptId,
        evaluation.overallScore,
        evaluation.qualitativeLevel,
        evaluation.deterministicScore,
        evaluation.semanticScore,
        evaluation.evaluatorType,
        JSON.stringify(evaluation.scoreDimensions),
        JSON.stringify(evaluation.ruleResults),
        JSON.stringify(evaluation.feedbackItems),
        JSON.stringify(evaluation.strengths),
        JSON.stringify(evaluation.areasForImprovement),
        evaluation.tradeoffCritique,
        JSON.stringify(evaluation.alternativeDesigns),
        evaluation.executionDurationMs,
        evaluation.evaluatedAt
      );

      updateAttempt.run(new Date().toISOString(), attemptId);
    });

    tx();
  }

  async getNextAttemptNumber(problemId: string): Promise<number> {
    const row = this.db.prepare('SELECT MAX(attempt_number) as max_num FROM attempts WHERE problem_id = ?').get(problemId) as { max_num: number | null };
    return (row?.max_num || 0) + 1;
  }
}
