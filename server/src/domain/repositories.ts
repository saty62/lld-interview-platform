import { Problem, Attempt, AttemptSummary, Evaluation, Design } from '../../shared/types.js';

export interface ProblemRepository {
  findAll(): Promise<Problem[]>;
  findById(id: string): Promise<Problem | null>;
  findBySlug(slug: string): Promise<Problem | null>;
}

export interface AttemptRepository {
  create(attempt: Attempt): Promise<Attempt>;
  findById(id: string): Promise<Attempt | null>;
  findByProblemId(problemId: string): Promise<Attempt[]>;
  findSummariesByProblemId(problemId: string): Promise<AttemptSummary[]>;
  findRecentSummaries(): Promise<AttemptSummary[]>;
  updateDraft(id: string, design: Design): Promise<Attempt>;
  updateStatus(id: string, status: Attempt['status'], failureReason?: string): Promise<void>;
  saveSubmissionSnapshot(id: string, snapshot: NonNullable<Attempt['submittedSnapshot']>): Promise<void>;
  saveEvaluation(attemptId: string, evaluation: Evaluation): Promise<void>;
  getNextAttemptNumber(problemId: string): Promise<number>;
}
