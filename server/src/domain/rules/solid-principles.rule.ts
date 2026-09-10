import { EvaluationRule, EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, FeedbackItem } from '../../../shared/types.js';

export class SolidPrinciplesRule implements EvaluationRule {
  readonly id = 'rule-solid-extensibility';
  readonly name = 'SOLID Principles & Extensibility';
  readonly category = 'EXTENSIBILITY';
  readonly maxScore = 15;

  async evaluate(context: EvaluationContext): Promise<RuleEvaluationResult> {
    const { design } = context;
    const feedback: FeedbackItem[] = [];
    let score = this.maxScore;

    if (design.classes.length === 0 && design.interfaces.length === 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        score: 0,
        maxScore: this.maxScore,
        passed: false,
        metrics: { interfacesCount: 0, patternsAppliedCount: 0, hasPolymorphism: 'No' },
        feedback: [
          {
            id: 'fb-solid-empty',
            category: 'EXTENSIBILITY',
            severity: 'CRITICAL',
            title: 'No Abstractions or Classes Declared',
            explanation: 'Cannot evaluate SOLID principles or extensibility without domain entities.',
            evidence: '0 classes, 0 interfaces.',
            recommendation: 'Declare classes and contracts.'
          }
        ]
      };
    }

    const classNames = new Set(design.classes.map((c) => c.name));
    const interfaceNames = new Set(design.interfaces.map((i) => i.name));

    // 1. Dependency Inversion Check (Are there interfaces representing polymorphic contracts?)
    const hasInterfaces = design.interfaces.length > 0;
    const hasInheritanceOrImpl = design.relationships.some(
      (r) => r.type === 'IMPLEMENTATION' || r.type === 'INHERITANCE'
    );

    if (!hasInterfaces && !hasInheritanceOrImpl && design.classes.length >= 1) {
      const isSole = design.classes.length === 1;
      score -= isSole ? 8 : 4;
      feedback.push({
        id: 'fb-solid-dip',
        category: 'EXTENSIBILITY',
        severity: 'WARNING',
        title: isSole ? 'Monolithic Non-Extensible Architecture' : 'Rigid Architecture (Dependency Inversion Violation)',
        explanation: isSole
          ? 'The design contains only 1 concrete class with 0 interfaces or abstractions. It cannot be extended without modifying existing source code (violating the Open-Closed Principle).'
          : 'All relationships in this design are concrete-to-concrete associations or compositions without any interface abstractions or inheritance hierarchies. This makes the system rigid and difficult to extend without modifying existing code (violating the Open-Closed Principle).',
        evidence: `0 interfaces and 0 polymorphic relationships across ${design.classes.length} class(es).`,
        recommendation: 'Extract interfaces for volatile components (such as pricing calculation, dispatch algorithms, or payment gateways) to allow new implementations to be injected cleanly.'
      });
    }

    // 2. Extensibility explanation & trade-offs check
    const extensibilityText = (design.extensibilityExplanation || '').trim();
    const tradeoffsText = (design.tradeoffs || '').trim();

    if (!extensibilityText || extensibilityText.length < 15) {
      score -= 2;
      feedback.push({
        id: 'fb-missing-extensibility',
        category: 'EXTENSIBILITY',
        severity: 'INFO',
        title: 'Missing Extensibility Rationale',
        explanation: 'In system and object-oriented design, explaining how the architecture accommodates future requirement changes is essential.',
        evidence: `Extensibility field has only ${extensibilityText.length} characters.`,
        recommendation: 'Document how your class structure would handle a new requirement (e.g., adding an alternative payment method, a new vehicle type, or a new dispatch algorithm).'
      });
    }

    // 3. Design pattern usage validation
    if (design.patternsApplied.length > 0) {
      for (const p of design.patternsApplied) {
        if (!p.justification || p.justification.trim().length < 10) {
          feedback.push({
            id: `fb-pattern-justification-${p.pattern}`,
            category: 'EXTENSIBILITY',
            severity: 'INFO',
            title: `Under-justified Design Pattern: "${p.pattern}"`,
            explanation: `You selected the "${p.pattern}" pattern, but provided little or no justification for why it was chosen over simpler alternatives.`,
            evidence: `Justification: "${p.justification || '(None)'}"`,
            recommendation: 'Explain which specific design force or changing requirement this pattern addresses.'
          });
        }
      }
    }

    // Praise for good abstraction
    if (hasInterfaces && (hasInheritanceOrImpl || design.patternsApplied.length > 0)) {
      feedback.push({
        id: 'fb-solid-praise',
        category: 'EXTENSIBILITY',
        severity: 'INFO',
        title: 'Extensible Contract-Based Design',
        explanation: 'Good use of interfaces or polymorphic hierarchies to decouple high-level coordination from low-level implementations.',
        evidence: `${design.interfaces.length} interfaces declared, ${design.patternsApplied.length} design patterns documented.`,
        recommendation: 'Ensure interfaces remain small and cohesive.'
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
        interfacesCount: design.interfaces.length,
        patternsAppliedCount: design.patternsApplied.length,
        hasPolymorphism: hasInheritanceOrImpl ? 'Yes' : 'No'
      },
      feedback
    };
  }
}
