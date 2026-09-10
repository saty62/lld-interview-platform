import Database from 'better-sqlite3';
import { ProblemRepository } from '../domain/repositories.js';
import { Problem } from '../../shared/types.js';

export class SqliteProblemRepository implements ProblemRepository {
  constructor(private db: Database.Database) {}

  private mapRowToProblem(row: any): Problem {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      difficulty: row.difficulty,
      estimatedMinutes: row.estimated_minutes,
      scenario: row.scenario,
      functionalRequirements: JSON.parse(row.functional_requirements),
      nonFunctionalRequirements: JSON.parse(row.non_functional_requirements),
      constraints: JSON.parse(row.constraints),
      useCases: JSON.parse(row.use_cases),
      evaluationCriteria: JSON.parse(row.evaluation_criteria),
      starterTemplate: JSON.parse(row.starter_template),
      domainRubric: JSON.parse(row.domain_rubric),
      createdAt: row.created_at
    };
  }

  async findAll(): Promise<Problem[]> {
    const stmt = this.db.prepare('SELECT * FROM problems ORDER BY title ASC');
    const rows = stmt.all();
    return rows.map((r) => this.mapRowToProblem(r));
  }

  async findById(id: string): Promise<Problem | null> {
    const stmt = this.db.prepare('SELECT * FROM problems WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToProblem(row) : null;
  }

  async findBySlug(slug: string): Promise<Problem | null> {
    const stmt = this.db.prepare('SELECT * FROM problems WHERE slug = ?');
    const row = stmt.get(slug);
    return row ? this.mapRowToProblem(row) : null;
  }
}
