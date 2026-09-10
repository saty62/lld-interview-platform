import { EvaluationRule, EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, FeedbackItem } from '../../../shared/types.js';

export class CouplingMetricsRule implements EvaluationRule {
  readonly id = 'rule-coupling-metrics';
  readonly name = 'Coupling & Dependency Metrics';
  readonly category = 'COUPLING_COHESION';
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
        metrics: { bidirectionalDependencies: 0, highFanOutEntities: 0, maxFanOut: 0 },
        feedback: [
          {
            id: 'fb-no-coupling-entities',
            category: 'COUPLING_COHESION',
            severity: 'INFO',
            title: 'No Entities to Evaluate for Coupling',
            explanation: 'Cannot compute coupling metrics because no classes were defined.',
            evidence: '0 classes declared.',
            recommendation: 'Define domain classes and connect them with relationships.'
          }
        ]
      };
    }

    // Check for single monolithic class or disconnected model
    if (design.classes.length === 1) {
      score -= 10;
      feedback.push({
        id: 'fb-monolithic-single-class',
        category: 'COUPLING_COHESION',
        severity: 'WARNING',
        title: 'Zero Architectural Decomposition: Single Class System',
        explanation: 'Only one class is declared. Object-oriented low-level design requires decomposing problems into collaborating entities with defined interaction boundaries.',
        evidence: '1 class declared with 0 relationships.',
        recommendation: 'Decompose the domain into specialized domain entities (e.g. Entity, Value Object, Service, Strategy).'
      });
    } else if (design.classes.length >= 2 && design.relationships.length === 0) {
      score -= 6;
      feedback.push({
        id: 'fb-disconnected-graph',
        category: 'COUPLING_COHESION',
        severity: 'WARNING',
        title: 'Disconnected Entities: No Relationships Declared',
        explanation: `Your design defines ${design.classes.length} classes but contains no relationships (associations, compositions, or dependencies). In Low-Level Design, classes must interact to satisfy business workflows.`,
        evidence: `0 relationships connecting ${design.classes.length} classes.`,
        recommendation: 'Declare relationships (e.g. Composition, Association, or Dependency) to show how entities collaborate.'
      });
    }

    const fanOut = new Map<string, Set<string>>();
    const fanIn = new Map<string, Set<string>>();

    for (const c of design.classes) {
      fanOut.set(c.name, new Set());
      fanIn.set(c.name, new Set());
    }
    for (const i of design.interfaces) {
      fanOut.set(i.name, new Set());
      fanIn.set(i.name, new Set());
    }

    // Populate graph edges from relationships
    for (const r of design.relationships) {
      const s = r.source.trim();
      const t = r.target.trim();
      if (fanOut.has(s)) fanOut.get(s)!.add(t);
      if (fanIn.has(t)) fanIn.get(t)!.add(s);
    }

    // 1. Detect bidirectional coupling between concrete classes
    const checkedPairs = new Set<string>();
    let bidirectionalCount = 0;

    for (const [source, targets] of fanOut.entries()) {
      for (const target of targets) {
        if (source === target) continue;
        const pairKey = [source, target].sort().join('<->');
        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);
          if (fanOut.get(target)?.has(source)) {
            bidirectionalCount++;
            score -= 3;
            feedback.push({
              id: `fb-bidirectional-${source}-${target}`,
              category: 'COUPLING_COHESION',
              severity: 'WARNING',
              title: `Bidirectional Concrete Coupling: ${source} <-> ${target}`,
              explanation: `Classes "${source}" and "${target}" have mutual direct dependencies on one another. Bidirectional dependencies prevent independent testing, complicate lifecycle management, and violate unidirectional data flow.`,
              evidence: `"${source}" references "${target}", and "${target}" references "${source}".`,
              recommendation: `Decouple them by applying the Observer Pattern (events/callbacks) or extracting an interface that one party implements.`,
              targetEntity: source
            });
          }
        }
      }
    }

    // 2. High Efferent Coupling (Fan-Out > 4 on non-coordinator classes)
    let highFanOutCount = 0;
    for (const [entityName, outgoing] of fanOut.entries()) {
      const isControllerOrManager = /(controller|manager|facade|service|orchestrator)/i.test(entityName);
      const threshold = isControllerOrManager ? 6 : 4;

      if (outgoing.size > threshold) {
        highFanOutCount++;
        score -= 2;
        const deps = Array.from(outgoing).join(', ');
        feedback.push({
          id: `fb-high-fanout-${entityName}`,
          category: 'COUPLING_COHESION',
          severity: 'WARNING',
          title: `Excessive Efferent Coupling (Fan-out = ${outgoing.size}): "${entityName}"`,
          explanation: `"${entityName}" directly depends on ${outgoing.size} other entities (${deps}). Classes with high Fan-out are fragile because changes to any of their dependencies ripple into this class.`,
          evidence: `Dependencies: ${deps}`,
          recommendation: `Introduce intermediate interfaces, use the Facade pattern, or apply Dependency Inversion to depend on contracts rather than concrete implementations.`,
          targetEntity: entityName
        });
      }
    }

    // Praise for clean low coupling
    if (bidirectionalCount === 0 && highFanOutCount === 0 && design.relationships.length > 0) {
      feedback.push({
        id: 'fb-coupling-praise',
        category: 'COUPLING_COHESION',
        severity: 'INFO',
        title: 'Controlled Coupling and Unidirectional Dependencies',
        explanation: 'The design maintains clean dependency directions without circular class-level couplings or excessive Fan-out.',
        evidence: `Max Fan-out across entities is ${Math.max(...Array.from(fanOut.values()).map((s) => s.size), 0)}.`,
        recommendation: 'Maintain this decoupling as system complexity grows.'
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
        bidirectionalDependencies: bidirectionalCount,
        highFanOutEntities: highFanOutCount,
        maxFanOut: Math.max(...Array.from(fanOut.values()).map((s) => s.size), 0)
      },
      feedback
    };
  }
}
