import { EvaluationRule, EvaluationContext } from '../evaluation-rule.interface.js';
import { SemanticEvaluator } from '../evaluators/semantic-evaluator.interface.js';
import {
  Problem,
  Design,
  Evaluation,
  ScoreDimension,
  QualitativeLevel,
  FeedbackItem,
  RuleEvaluationResult
} from '../../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export class EvaluationPipeline {
  constructor(
    private rules: EvaluationRule[],
    private semanticEvaluator: SemanticEvaluator
  ) {}

  async execute(attemptId: string, problem: Problem, design: Design): Promise<Evaluation> {
    const startTime = Date.now();
    const context: EvaluationContext = { problem, design };

    // 1. Run all deterministic rules in isolated try/catch blocks
    const ruleResults: RuleEvaluationResult[] = [];
    for (const rule of this.rules) {
      try {
        const result = await rule.evaluate(context);
        ruleResults.push(result);
      } catch (err: any) {
        console.error(`[EvaluationPipeline] Error executing rule ${rule.id}:`, err);
        ruleResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          score: 0,
          maxScore: rule.maxScore,
          passed: false,
          metrics: { error: err.message || 'Execution error' },
          feedback: [
            {
              id: `fb-err-${rule.id}`,
              category: rule.category,
              severity: 'WARNING',
              title: `Rule Evaluation Notice: ${rule.name}`,
              explanation: 'This rule encountered an internal error during execution.',
              evidence: err.message || 'Unknown error',
              recommendation: 'Check model formatting.'
            }
          ]
        });
      }
    }

    // 2. Invoke semantic evaluator
    const semanticFeedback = await this.semanticEvaluator.evaluate(context, ruleResults);

    // 3. Compute deterministic and semantic scores
    const isEmpty = (design.classes?.length || 0) === 0 && (design.interfaces?.length || 0) === 0;

    let earnedDeterministic = 0;
    let maxDeterministic = 0;
    for (const r of ruleResults) {
      earnedDeterministic += r.score;
      maxDeterministic += r.maxScore;
    }

    const deterministicScore = Math.round(
      maxDeterministic > 0 ? (earnedDeterministic / maxDeterministic) * 100 : 0
    );

    // Semantic score: Use dynamic heuristic/LLM output when available, with empty-model protection
    let semanticScore = 0;
    if (!isEmpty) {
      if (typeof semanticFeedback.semanticScore === 'number') {
        semanticScore = semanticFeedback.semanticScore;
      } else {
        let semanticBonus = 0;
        if (design.tradeoffs && design.tradeoffs.trim().length > 30) semanticBonus += 30;
        else if (design.tradeoffs && design.tradeoffs.trim().length > 10) semanticBonus += 15;

        if (design.extensibilityExplanation && design.extensibilityExplanation.trim().length > 30) semanticBonus += 35;
        else if (design.extensibilityExplanation && design.extensibilityExplanation.trim().length > 10) semanticBonus += 20;

        if (design.patternsApplied && design.patternsApplied.length > 0) semanticBonus += 35;

        semanticScore = Math.min(100, semanticBonus);
      }
    }

    // Overall score: 65% deterministic + 35% semantic reasoning (zeroed out on empty models)
    const overallScore = isEmpty ? 0 : Math.round(deterministicScore * 0.65 + semanticScore * 0.35);

    // Qualitative level
    let qualitativeLevel: QualitativeLevel = 'NEEDS_IMPROVEMENT';
    if (overallScore >= 85) qualitativeLevel = 'EXEMPLARY';
    else if (overallScore >= 70) qualitativeLevel = 'PROFICIENT';
    else if (overallScore >= 50) qualitativeLevel = 'DEVELOPING';

    // 4. Build dimension breakdowns dynamically across all registered rule categories
    const categoryMetadata: Record<string, { label: string; description: string }> = {
      REQUIREMENTS_COVERAGE: {
        label: 'Requirements Coverage',
        description: 'Mapping of functional requirements to domain entities and contracts.'
      },
      RESPONSIBILITY_ALLOCATION: {
        label: 'Responsibility & Cohesion',
        description: 'Adherence to Single Responsibility Principle and prevention of God Classes.'
      },
      COUPLING_COHESION: {
        label: 'Coupling & Graph Metrics',
        description: 'Fan-in / Fan-out balance and elimination of bidirectional dependencies.'
      },
      STRUCTURAL_INTEGRITY: {
        label: 'Structural Integrity',
        description: 'Reference validity, unique identifiers, and absence of inheritance cycles.'
      },
      EXTENSIBILITY: {
        label: 'Extensibility & Reasoning',
        description: 'Contract-based design, design patterns, and justified trade-off reasoning.'
      }
    };

    const categoryMap = new Map<string, { earned: number; max: number }>();
    for (const r of ruleResults) {
      const existing = categoryMap.get(r.category) || { earned: 0, max: 0 };
      existing.earned += r.score;
      existing.max += r.maxScore;
      categoryMap.set(r.category, existing);
    }

    const scoreDimensions: ScoreDimension[] = Array.from(categoryMap.entries()).map(([cat, stats]) => {
      const meta = categoryMetadata[cat] || {
        label: cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `Evaluation dimension for ${cat}`
      };
      return {
        key: cat,
        label: meta.label,
        score: stats.earned,
        maxScore: stats.max,
        percentage: stats.max > 0 ? Math.round((stats.earned / stats.max) * 100) : 0,
        description: meta.description
      };
    });

    // 5. Aggregate all feedback items
    const allFeedbackItems: FeedbackItem[] = [];
    for (const r of ruleResults) {
      allFeedbackItems.push(...r.feedback);
    }

    // Sort by severity: CRITICAL first, then WARNING, then INFO
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    allFeedbackItems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const executionDurationMs = Date.now() - startTime;

    return {
      id: uuidv4(),
      attemptId,
      overallScore,
      qualitativeLevel,
      deterministicScore,
      semanticScore,
      evaluatorType: this.semanticEvaluator.type,
      scoreDimensions,
      ruleResults,
      feedbackItems: allFeedbackItems,
      strengths: semanticFeedback.strengths,
      areasForImprovement: semanticFeedback.areasForImprovement,
      tradeoffCritique: semanticFeedback.tradeoffCritique,
      alternativeDesigns: semanticFeedback.alternativeDesigns,
      executionDurationMs,
      evaluatedAt: new Date().toISOString()
    };
  }
}
