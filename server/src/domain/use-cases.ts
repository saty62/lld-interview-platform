import { v4 as uuidv4 } from 'uuid';
import { ProblemRepository, AttemptRepository } from './repositories.js';
import { EvaluationPipeline } from './pipeline/evaluation-pipeline.js';
import { AttemptEntity } from './entities/attempt.entity.js';
import { DesignEntity } from './entities/design.entity.js';
import {
  Problem,
  Attempt,
  AttemptSummary,
  AttemptComparison,
  Design
} from '../../shared/types.js';

export class UseCases {
  constructor(
    private problemRepo: ProblemRepository,
    private attemptRepo: AttemptRepository,
    private pipeline: EvaluationPipeline
  ) {}

  async listProblems(): Promise<Problem[]> {
    return this.problemRepo.findAll();
  }

  async getProblemBySlug(slug: string): Promise<Problem | null> {
    return this.getProblemByIdOrSlug(slug);
  }

  async getProblemByIdOrSlug(idOrSlug: string): Promise<Problem | null> {
    const bySlug = await this.problemRepo.findBySlug(idOrSlug);
    if (bySlug) return bySlug;
    return this.problemRepo.findById(idOrSlug);
  }

  async createAttempt(problemSlug: string, forkFromAttemptId?: string): Promise<Attempt> {
    const problem = await this.problemRepo.findBySlug(problemSlug);
    if (!problem) {
      throw new Error(`Problem with slug "${problemSlug}" not found.`);
    }

    const nextAttemptNumber = await this.attemptRepo.getNextAttemptNumber(problem.id);
    let initialDesign: Design;

    if (forkFromAttemptId) {
      const parentAttempt = await this.attemptRepo.findById(forkFromAttemptId);
      if (parentAttempt) {
        const parentEntity = AttemptEntity.fromExisting(parentAttempt);
        const forked = parentEntity.forkToNextAttempt(uuidv4(), nextAttemptNumber);
        return this.attemptRepo.create(forked.toJSON());
      }
    }

    initialDesign = {
      classes: JSON.parse(JSON.stringify(problem.starterTemplate.classes || [])),
      interfaces: JSON.parse(JSON.stringify(problem.starterTemplate.interfaces || [])),
      relationships: JSON.parse(JSON.stringify(problem.starterTemplate.relationships || [])),
      patternsApplied: [],
      assumptions: problem.starterTemplate.assumptions ? [...problem.starterTemplate.assumptions] : [],
      tradeoffs: problem.starterTemplate.tradeoffs || '',
      extensibilityExplanation: problem.starterTemplate.extensibilityExplanation || ''
    };

    const newAttemptEntity = AttemptEntity.createNew(
      uuidv4(),
      problem.id,
      nextAttemptNumber,
      initialDesign
    );

    return this.attemptRepo.create(newAttemptEntity.toJSON());
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    return this.attemptRepo.findById(id);
  }

  async saveDraft(id: string, design: Design): Promise<Attempt> {
    const existing = await this.attemptRepo.findById(id);
    if (!existing) {
      throw new Error(`Attempt ${id} not found.`);
    }

    const entity = AttemptEntity.fromExisting(existing);
    const designEntity = DesignEntity.create(design);
    entity.updateDraft(designEntity);

    return this.attemptRepo.updateDraft(id, entity.draftDesign);
  }

  async submitAttempt(id: string): Promise<Attempt> {
    const attemptData = await this.attemptRepo.findById(id);
    if (!attemptData) {
      throw new Error(`Attempt ${id} not found.`);
    }

    const problem = await this.problemRepo.findById(attemptData.problemId);
    if (!problem) {
      throw new Error(`Associated problem ${attemptData.problemId} not found.`);
    }

    const entity = AttemptEntity.fromExisting(attemptData);
    const snapshot = entity.submit(uuidv4());

    // Commit snapshot to SQLite immediately so no work is lost
    await this.attemptRepo.saveSubmissionSnapshot(id, snapshot);
    await this.attemptRepo.updateStatus(id, 'EVALUATING');

    try {
      const evaluation = await this.pipeline.execute(id, problem, snapshot.design);
      entity.startEvaluation();
      entity.completeEvaluation(evaluation);
      await this.attemptRepo.saveEvaluation(id, evaluation);
    } catch (err: any) {
      console.error(`[UseCases] Pipeline evaluation failed for attempt ${id}:`, err);
      entity.failEvaluation(err.message || 'Evaluation pipeline error');
      await this.attemptRepo.updateStatus(id, 'EVALUATION_FAILED', err.message || 'Evaluation pipeline error');
    }

    const finalAttempt = await this.attemptRepo.findById(id);
    return finalAttempt!;
  }

  async retryEvaluation(id: string): Promise<Attempt> {
    const attempt = await this.attemptRepo.findById(id);
    if (!attempt || !attempt.submittedSnapshot) {
      throw new Error(`Attempt ${id} does not have a submitted snapshot to evaluate.`);
    }

    const problem = await this.problemRepo.findById(attempt.problemId);
    if (!problem) throw new Error('Problem not found');

    await this.attemptRepo.updateStatus(id, 'EVALUATING');

    try {
      const evaluation = await this.pipeline.execute(id, problem, attempt.submittedSnapshot.design);
      await this.attemptRepo.saveEvaluation(id, evaluation);
    } catch (err: any) {
      console.error(`[UseCases] Retry evaluation failed for attempt ${id}:`, err);
      await this.attemptRepo.updateStatus(id, 'EVALUATION_FAILED', err.message || 'Retry error');
    }

    const updated = await this.attemptRepo.findById(id);
    return updated!;
  }

  async getAttemptHistory(problemSlug: string): Promise<AttemptSummary[]> {
    const problem = await this.problemRepo.findBySlug(problemSlug);
    if (!problem) return [];
    return this.attemptRepo.findSummariesByProblemId(problem.id);
  }

  async getRecentAttempts(): Promise<AttemptSummary[]> {
    return this.attemptRepo.findRecentSummaries();
  }

  async compareAttempts(baseAttemptId: string, targetAttemptId: string): Promise<AttemptComparison> {
    const base = await this.attemptRepo.findById(baseAttemptId);
    const target = await this.attemptRepo.findById(targetAttemptId);

    if (!base || !target) {
      throw new Error('Both base and target attempts must exist for comparison.');
    }

    const baseDesign = base.submittedSnapshot ? base.submittedSnapshot.design : base.draftDesign;
    const targetDesign = target.submittedSnapshot ? target.submittedSnapshot.design : target.draftDesign;

    const baseScore = base.evaluation?.overallScore || 0;
    const targetScore = target.evaluation?.overallScore || 0;
    const scoreDiff = targetScore - baseScore;

    const baseClassCount = baseDesign.classes.length;
    const targetClassCount = targetDesign.classes.length;
    const classesDiff = targetClassCount - baseClassCount;

    const baseMethodsCount = baseDesign.classes.reduce((acc, c) => acc + c.methods.length, 0);
    const targetMethodsCount = targetDesign.classes.reduce((acc, c) => acc + c.methods.length, 0);
    const methodsDiff = targetMethodsCount - baseMethodsCount;

    const baseCoupling = baseDesign.relationships.length;
    const targetCoupling = targetDesign.relationships.length;
    const couplingDiff = targetCoupling - baseCoupling;

    const improvements: string[] = [];
    const regressions: string[] = [];

    if (scoreDiff > 0) {
      improvements.push(`Overall architecture score increased by ${scoreDiff} points (from ${baseScore} to ${targetScore}).`);
    } else if (scoreDiff < 0) {
      regressions.push(`Overall score decreased by ${Math.abs(scoreDiff)} points.`);
    }

    // Entity differences (Added / Removed classes)
    const baseClassNames = new Set(baseDesign.classes.map((c) => c.name));
    const targetClassNames = new Set(targetDesign.classes.map((c) => c.name));

    const addedClasses = [...targetClassNames].filter((name) => !baseClassNames.has(name));
    const removedClasses = [...baseClassNames].filter((name) => !targetClassNames.has(name));

    if (addedClasses.length > 0) {
      improvements.push(`Added ${addedClasses.length} new domain class(es): ${addedClasses.join(', ')}.`);
    }
    if (removedClasses.length > 0) {
      improvements.push(`Refactored / removed ${removedClasses.length} class(es): ${removedClasses.join(', ')}.`);
    }

    // Interface additions
    const baseInterfaceNames = new Set(baseDesign.interfaces.map((i) => i.name));
    const targetInterfaceNames = new Set(targetDesign.interfaces.map((i) => i.name));
    const addedInterfaces = [...targetInterfaceNames].filter((name) => !baseInterfaceNames.has(name));

    if (addedInterfaces.length > 0) {
      improvements.push(`Introduced ${addedInterfaces.length} new interface abstraction(s): ${addedInterfaces.join(', ')}.`);
    }

    // Design Pattern additions
    const patternDiff = targetDesign.patternsApplied.length - baseDesign.patternsApplied.length;
    if (patternDiff > 0) {
      improvements.push(`Applied ${patternDiff} additional design pattern(s) to isolate behavioral variation.`);
    }

    // Check for resolved rule failures
    if (base.evaluation && target.evaluation) {
      for (const baseRule of base.evaluation.ruleResults) {
        if (!baseRule.passed) {
          const targetRule = target.evaluation.ruleResults.find((r) => r.ruleId === baseRule.ruleId);
          if (targetRule && targetRule.passed) {
            improvements.push(`Resolved previously flagged issues in: "${baseRule.ruleName}".`);
          }
        }
      }

      // Check dimension improvements
      for (const baseDim of base.evaluation.scoreDimensions) {
        const targetDim = target.evaluation.scoreDimensions.find((d) => d.key === baseDim.key);
        if (targetDim && targetDim.score > baseDim.score) {
          improvements.push(`${baseDim.label} score improved from ${baseDim.score}/${baseDim.maxScore} to ${targetDim.score}/${targetDim.maxScore}.`);
        }
      }
    }

    // Check for trade-offs
    if ((targetDesign.tradeoffs || '').length > (baseDesign.tradeoffs || '').length + 20) {
      improvements.push('Expanded architectural trade-off reasoning and alternative justification.');
    }

    // Summary statement
    const summary = scoreDiff >= 0
      ? `Attempt #${target.attemptNumber} demonstrates measurable architectural progression over Attempt #${base.attemptNumber}. Design abstractions and requirements coverage have improved.`
      : `Attempt #${target.attemptNumber} has new regressions or unresolved issues compared to Attempt #${base.attemptNumber}. Review the feedback scorecard for specific recommendations.`;

    return {
      baseAttemptId,
      targetAttemptId,
      baseAttemptNumber: base.attemptNumber,
      targetAttemptNumber: target.attemptNumber,
      scoreDiff,
      metricsDiff: {
        couplingDiff,
        classesDiff,
        methodsDiff,
        requirementsCoverageDiff: targetScore - baseScore
      },
      improvements,
      regressions,
      summary
    };
  }
}
