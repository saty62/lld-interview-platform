import {
  Attempt,
  AttemptStatus,
  SubmissionSnapshot,
  Evaluation,
  Design
} from '../../../shared/types.js';
import { DesignEntity } from './design.entity.js';

export class AttemptEntity {
  private constructor(private state: Attempt) {}

  public static createNew(
    id: string,
    problemId: string,
    attemptNumber: number,
    initialDesign: Design
  ): AttemptEntity {
    const now = new Date().toISOString();
    return new AttemptEntity({
      id,
      problemId,
      attemptNumber,
      status: 'DRAFT',
      draftDesign: JSON.parse(JSON.stringify(initialDesign)),
      submittedSnapshot: null,
      evaluation: null,
      createdAt: now,
      updatedAt: now,
      submittedAt: null
    });
  }

  public static fromExisting(state: Attempt): AttemptEntity {
    return new AttemptEntity(JSON.parse(JSON.stringify(state)));
  }

  public toJSON(): Attempt {
    return JSON.parse(JSON.stringify(this.state));
  }

  public get id(): string {
    return this.state.id;
  }

  public get problemId(): string {
    return this.state.problemId;
  }

  public get attemptNumber(): number {
    return this.state.attemptNumber;
  }

  public get status(): AttemptStatus {
    return this.state.status;
  }

  public get draftDesign(): Design {
    return this.state.draftDesign;
  }

  public get submittedSnapshot(): SubmissionSnapshot | null {
    return this.state.submittedSnapshot;
  }

  public get evaluation(): Evaluation | null {
    return this.state.evaluation;
  }

  public get failureReason(): string | undefined {
    return this.state.failureReason;
  }

  public canEdit(): boolean {
    return this.state.status === 'DRAFT';
  }

  public updateDraft(design: DesignEntity): void {
    if (!this.canEdit()) {
      throw new Error(`Cannot modify draft for attempt ${this.state.id}: Attempt is in status "${this.state.status}".`);
    }
    this.state.draftDesign = design.toJSON();
    this.state.updatedAt = new Date().toISOString();
  }

  public submit(submissionId: string): SubmissionSnapshot {
    if (this.state.status !== 'DRAFT') {
      throw new Error(`Cannot submit attempt ${this.state.id}: Already submitted or evaluated (status: ${this.state.status}).`);
    }

    const designEntity = DesignEntity.create(this.state.draftDesign);
    const validation = designEntity.validateInvariants();
    if (!validation.isValid) {
      throw new Error(`Submission rejected due to structural errors: ${validation.errors.join('; ')}`);
    }

    const now = new Date().toISOString();
    const snapshot: SubmissionSnapshot = {
      submissionId,
      submittedAt: now,
      design: designEntity.toJSON()
    };

    this.state.status = 'SUBMITTED';
    this.state.submittedSnapshot = snapshot;
    this.state.submittedAt = now;
    this.state.updatedAt = now;

    return snapshot;
  }

  public startEvaluation(): void {
    if (this.state.status !== 'SUBMITTED' && this.state.status !== 'EVALUATION_FAILED') {
      throw new Error(`Cannot start evaluation from status "${this.state.status}".`);
    }
    this.state.status = 'EVALUATING';
    this.state.failureReason = undefined;
    this.state.updatedAt = new Date().toISOString();
  }

  public completeEvaluation(evaluation: Evaluation): void {
    if (this.state.status !== 'EVALUATING') {
      throw new Error(`Cannot complete evaluation: Attempt is in status "${this.state.status}".`);
    }
    this.state.status = 'EVALUATED';
    this.state.evaluation = evaluation;
    this.state.updatedAt = new Date().toISOString();
  }

  public failEvaluation(reason: string): void {
    this.state.status = 'EVALUATION_FAILED';
    this.state.failureReason = reason;
    this.state.updatedAt = new Date().toISOString();
  }

  public forkToNextAttempt(nextAttemptId: string, nextAttemptNumber: number): AttemptEntity {
    // Uses the submitted snapshot if present, otherwise current draft
    const baseDesign = this.state.submittedSnapshot
      ? this.state.submittedSnapshot.design
      : this.state.draftDesign;

    return AttemptEntity.createNew(
      nextAttemptId,
      this.state.problemId,
      nextAttemptNumber,
      baseDesign
    );
  }
}
