import { EvaluationRule, EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, FeedbackItem } from '../../../shared/types.js';

export class RequirementsCoverageRule implements EvaluationRule {
  readonly id = 'rule-requirements-coverage';
  readonly name = 'Functional Requirements Coverage';
  readonly category = 'REQUIREMENTS_COVERAGE';
  readonly maxScore = 25;

  async evaluate(context: EvaluationContext): Promise<RuleEvaluationResult> {
    const { problem, design } = context;
    const feedback: FeedbackItem[] = [];

    // Aggregate all text tokens in learner's design (class names, method names, responsibilities, attribute names)
    const learnerTokens: string[] = [];
    for (const c of design.classes) {
      learnerTokens.push(c.name.toLowerCase());
      learnerTokens.push((c.responsibility || '').toLowerCase());
      for (const m of c.methods) {
        learnerTokens.push(m.name.toLowerCase());
        learnerTokens.push((m.parameters || '').toLowerCase());
      }
      for (const a of c.attributes) {
        learnerTokens.push(a.name.toLowerCase());
      }
    }
    for (const i of design.interfaces) {
      learnerTokens.push(i.name.toLowerCase());
      learnerTokens.push((i.responsibility || '').toLowerCase());
      for (const m of i.methods) {
        learnerTokens.push(m.name.toLowerCase());
      }
    }
    learnerTokens.push((design.tradeoffs || '').toLowerCase());
    learnerTokens.push((design.extensibilityExplanation || '').toLowerCase());
    learnerTokens.push(design.assumptions.join(' ').toLowerCase());

    const aggregatedLearnerText = learnerTokens.join(' ');

    let coveredCount = 0;
    let totalRequirements = problem.functionalRequirements.length;
    let earnedWeight = 0;
    let totalWeight = 0;

    for (const req of problem.functionalRequirements) {
      totalWeight += req.weight;
      // Check if at least 1-2 key concepts or title words are matched in the learner's vocabulary
      const matchedConcepts = req.keyConcepts.filter((concept) =>
        aggregatedLearnerText.includes(concept.toLowerCase())
      );

      const titleWords = req.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchedTitleWords = titleWords.filter((w) => aggregatedLearnerText.includes(w));

      const isCovered = matchedConcepts.length >= 1 || matchedTitleWords.length >= 1;

      if (isCovered) {
        coveredCount++;
        earnedWeight += req.weight;
      } else {
        feedback.push({
          id: `fb-uncovered-${req.code}`,
          category: 'REQUIREMENTS_COVERAGE',
          severity: 'WARNING',
          title: `Unaddressed Requirement: ${req.code} (${req.title})`,
          explanation: `The requirement "${req.title}" (${req.description}) does not appear to have corresponding methods, attributes, or responsibilities in any of your declared classes or interfaces.`,
          evidence: `Expected concepts such as ${req.keyConcepts.slice(0, 4).join(', ')} were not identified in class responsibilities or method contracts.`,
          recommendation: `Introduce or assign responsibility for ${req.title.toLowerCase()} to an appropriate entity (e.g. via a dedicated service, strategy interface, or state machine).`
        });
      }
    }

    const coverageRatio = totalWeight > 0 ? earnedWeight / totalWeight : 1;
    let score = Math.round(coverageRatio * this.maxScore);

    const totalMethodsCount =
      design.classes.reduce((sum, c) => sum + c.methods.length, 0) +
      design.interfaces.reduce((sum, i) => sum + i.methods.length, 0);

    if (design.classes.length > 0 && totalMethodsCount === 0) {
      score = Math.round(score * 0.5);
      feedback.push({
        id: 'fb-reqs-no-methods',
        category: 'REQUIREMENTS_COVERAGE',
        severity: 'WARNING',
        title: 'Anemic Model: No Method Contracts Declared',
        explanation: 'Classes were defined, but none of them declare operational methods to execute functional requirements.',
        evidence: '0 methods declared across all classes.',
        recommendation: 'Add domain methods specifying parameters and return types to fulfill functional requirements.'
      });
    }

    if (coveredCount === totalRequirements && totalRequirements > 0) {
      feedback.push({
        id: 'fb-reqs-full-coverage',
        category: 'REQUIREMENTS_COVERAGE',
        severity: 'INFO',
        title: 'Comprehensive Requirements Coverage',
        explanation: 'All declared functional requirements have identifiable responsibilities, methods, or abstractions across the design.',
        evidence: `${coveredCount} of ${totalRequirements} functional requirements satisfied.`,
        recommendation: 'Verify that edge case parameters and return types are thoroughly specified on your method signatures.'
      });
    }

    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      score,
      maxScore: this.maxScore,
      passed: score >= this.maxScore * 0.7,
      metrics: {
        totalRequirements,
        coveredRequirements: coveredCount,
        coveragePercentage: Math.round(coverageRatio * 100)
      },
      feedback
    };
  }
}
