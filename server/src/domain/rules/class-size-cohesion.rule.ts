import { EvaluationRule, EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, FeedbackItem } from '../../../shared/types.js';

export class ClassSizeAndCohesionRule implements EvaluationRule {
  readonly id = 'rule-class-size-cohesion';
  readonly name = 'Class Responsibility & Cohesion';
  readonly category = 'RESPONSIBILITY_ALLOCATION';
  readonly maxScore = 20;

  async evaluate(context: EvaluationContext): Promise<RuleEvaluationResult> {
    const { design } = context;
    const feedback: FeedbackItem[] = [];
    let score = this.maxScore;

    if (design.classes.length === 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        score: 0,
        maxScore: this.maxScore,
        passed: false,
        metrics: { totalClasses: 0, godClasses: 0, emptyResponsibilities: 0, ghostClasses: 0 },
        feedback: [
          {
            id: 'fb-empty-classes',
            category: 'RESPONSIBILITY_ALLOCATION',
            severity: 'CRITICAL',
            title: 'Empty Architecture: No Classes Defined',
            explanation: 'An object-oriented design must define concrete or abstract domain classes to encapsulate behavior and state.',
            evidence: '0 classes declared in design.',
            recommendation: 'Declare core domain entities representing the primary actors and aggregates of the system.'
          }
        ]
      };
    }

    let emptyResponsibilityCount = 0;
    let godClassCount = 0;
    let ghostClassCount = 0;

    for (const cls of design.classes) {
      const resp = (cls.responsibility || '').trim();
      const methodCount = cls.methods.length;
      const attrCount = cls.attributes.length;

      // 1. Missing or trivial responsibility description
      if (!resp || resp.length < 8) {
        emptyResponsibilityCount++;
        score -= 2;
        feedback.push({
          id: `fb-empty-resp-${cls.id || cls.name}`,
          category: 'RESPONSIBILITY_ALLOCATION',
          severity: 'WARNING',
          title: `Vague or Missing Responsibility: "${cls.name}"`,
          explanation: `Class "${cls.name}" lacks an explicit, documented responsibility. In Low-Level Design, clearly articulating a class's single purpose is critical to adhering to the Single Responsibility Principle (SRP).`,
          evidence: `Current responsibility: "${resp || '(Empty)'}"`,
          recommendation: `Define what business invariant or domain responsibility "${cls.name}" encapsulates. If it has no unique purpose, consider merging or eliminating it.`,
          targetEntity: cls.name
        });
      }

      // 2. God Class detection (>7 methods or combined size > 12)
      if (methodCount > 7 || (methodCount > 5 && attrCount > 6)) {
        godClassCount++;
        const isSoleClass = design.classes.length === 1;
        score -= isSoleClass ? this.maxScore : 8;
        feedback.push({
          id: `fb-god-class-${cls.id || cls.name}`,
          category: 'RESPONSIBILITY_ALLOCATION',
          severity: isSoleClass ? 'CRITICAL' : 'WARNING',
          title: isSoleClass
            ? `Monolithic God Class: "${cls.name}" absorbs the entire domain`
            : `Potential God Class Detected: "${cls.name}"`,
          explanation: isSoleClass
            ? `Your entire design consists of a single monolithic class ("${cls.name}") containing ${methodCount} methods and ${attrCount} attributes. In Low-Level Design, a single class must not encapsulate all domain logic, spot allocation, payments, and notifications.`
            : `Class "${cls.name}" defines ${methodCount} methods and ${attrCount} attributes. When a class accumulates too many responsibilities, it becomes tightly coupled to multiple external actors and violates High Cohesion.`,
          evidence: `${methodCount} methods (${cls.methods.map((m) => m.name).slice(0, 4).join(', ')}...), ${attrCount} attributes.`,
          recommendation: `Decompose "${cls.name}" by extracting sub-domains into dedicated helper, strategy, or state classes.`,
          targetEntity: cls.name
        });
      }

      // 3. Ghost Class detection (Anemic / empty class)
      if (methodCount === 0 && attrCount === 0) {
        ghostClassCount++;
        score -= 2;
        feedback.push({
          id: `fb-ghost-class-${cls.id || cls.name}`,
          category: 'RESPONSIBILITY_ALLOCATION',
          severity: 'INFO',
          title: `Empty Entity Stub: "${cls.name}"`,
          explanation: `Class "${cls.name}" has no declared methods or attributes. While empty markers or abstract types exist, domain classes in LLD should declare their behavioral contracts.`,
          evidence: `0 methods, 0 attributes declared.`,
          recommendation: `Add the core methods that other classes invoke on "${cls.name}", or replace it with an interface if it is merely a contract.`,
          targetEntity: cls.name
        });
      }
    }

    // Check interfaces for ISP (fat interface with > 5 methods)
    for (const iface of design.interfaces) {
      if (iface.methods.length > 5) {
        score -= 2;
        feedback.push({
          id: `fb-fat-iface-${iface.id || iface.name}`,
          category: 'RESPONSIBILITY_ALLOCATION',
          severity: 'WARNING',
          title: `Interface Segregation Risk: "${iface.name}"`,
          explanation: `Interface "${iface.name}" contains ${iface.methods.length} methods. Clients implementing this interface may be forced to depend on methods they do not need (violating the Interface Segregation Principle).`,
          evidence: `${iface.methods.length} methods defined on interface.`,
          recommendation: `Split "${iface.name}" into smaller, role-focused interfaces that clients can selectively implement.`,
          targetEntity: iface.name
        });
      }
    }

    // Praise for good cohesion
    if (godClassCount === 0 && emptyResponsibilityCount === 0 && design.classes.length >= 2) {
      feedback.push({
        id: 'fb-cohesion-praise',
        category: 'RESPONSIBILITY_ALLOCATION',
        severity: 'INFO',
        title: 'Well-Defined Class Responsibilities',
        explanation: 'Classes in this design have focused method counts and clearly documented single responsibilities, exhibiting strong cohesion.',
        evidence: `Average methods per class: ${(design.classes.reduce((sum, c) => sum + c.methods.length, 0) / (design.classes.length || 1)).toFixed(1)}`,
        recommendation: 'Continue protecting class boundaries as new features are added.'
      });
    }

    const finalScore = Math.max(0, Math.min(this.maxScore, score));
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      score: finalScore,
      maxScore: this.maxScore,
      passed: finalScore >= this.maxScore * 0.7,
      metrics: {
        totalClasses: design.classes.length,
        godClasses: godClassCount,
        emptyResponsibilities: emptyResponsibilityCount,
        ghostClasses: ghostClassCount
      },
      feedback
    };
  }
}
