import { EvaluationRule, EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, FeedbackItem } from '../../../shared/types.js';

export class RelationshipIntegrityRule implements EvaluationRule {
  readonly id = 'rule-relationship-integrity';
  readonly name = 'Structural & Relationship Integrity';
  readonly category = 'STRUCTURAL_INTEGRITY';
  readonly maxScore = 20;

  async evaluate(context: EvaluationContext): Promise<RuleEvaluationResult> {
    const { design } = context;
    const feedback: FeedbackItem[] = [];
    let score = this.maxScore;

    const classNames = new Set(design.classes.map((c) => c.name.trim()));
    const interfaceNames = new Set(design.interfaces.map((i) => i.name.trim()));
    const allEntityNames = new Set([...classNames, ...interfaceNames]);

    if (allEntityNames.size === 0) {
      return {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        score: 0,
        maxScore: this.maxScore,
        passed: false,
        metrics: { totalEntities: 0, danglingRelationshipsCount: 0, hasCycle: 'No' },
        feedback: [
          {
            id: 'fb-empty-integrity',
            category: 'STRUCTURAL_INTEGRITY',
            severity: 'CRITICAL',
            title: 'No Entities Declared for Structural Validation',
            explanation: 'Cannot validate relationships, inheritance, or types on an empty model.',
            evidence: '0 entities declared.',
            recommendation: 'Declare domain classes and interfaces before submitting.'
          }
        ]
      };
    }

    // 1. Duplicate entity detection
    const seenNames = new Map<string, number>();
    for (const c of design.classes) {
      const name = c.name.trim();
      seenNames.set(name, (seenNames.get(name) || 0) + 1);
    }
    for (const i of design.interfaces) {
      const name = i.name.trim();
      seenNames.set(name, (seenNames.get(name) || 0) + 1);
    }

    const duplicates: string[] = [];
    for (const [name, count] of seenNames.entries()) {
      if (count > 1 && name) {
        duplicates.push(name);
      }
    }

    if (duplicates.length > 0) {
      score -= Math.min(8, duplicates.length * 4);
      feedback.push({
        id: 'fb-dup-entities',
        category: 'STRUCTURAL_INTEGRITY',
        severity: 'CRITICAL',
        title: 'Duplicate Entity Declarations Detected',
        explanation: `Multiple classes or interfaces share the same identifier: ${duplicates.join(', ')}. In object-oriented design, type identifiers within the same domain scope must be unique to prevent namespace collisions and ambiguous instantiation.`,
        evidence: `Duplicate identifiers: ${duplicates.join(', ')}`,
        recommendation: 'Ensure each class or interface represents a distinct abstraction with a unique name.'
      });
    }

    // 2. Dangling relationship references
    const danglingRelationships = design.relationships.filter(
      (r) => !allEntityNames.has(r.source.trim()) || !allEntityNames.has(r.target.trim())
    );

    if (danglingRelationships.length > 0) {
      score -= Math.min(12, danglingRelationships.length * 6);
      for (const dr of danglingRelationships) {
        const missing = [];
        if (!allEntityNames.has(dr.source.trim())) missing.push(`Source: "${dr.source}"`);
        if (!allEntityNames.has(dr.target.trim())) missing.push(`Target: "${dr.target}"`);

        feedback.push({
          id: `fb-dangling-${dr.id || Math.random()}`,
          category: 'STRUCTURAL_INTEGRITY',
          severity: 'CRITICAL',
          title: `Dangling Relationship Reference (${dr.source} -> ${dr.target})`,
          explanation: `A relationship connects entities that are not defined in the class or interface registry. Both parties in an association, inheritance, or dependency must exist as declared domain types.`,
          evidence: `Undefined entities referenced: ${missing.join(', ')}`,
          recommendation: `Declare missing types in the Classes/Interfaces builder, or correct the source/target reference names.`
        });
      }
    }

    // 3. Inheritance cycles & semantics check
    const inheritanceAdj = new Map<string, string[]>();
    for (const r of design.relationships) {
      if (r.type === 'INHERITANCE' || r.type === 'IMPLEMENTATION') {
        const s = r.source.trim();
        const t = r.target.trim();
        if (!inheritanceAdj.has(s)) inheritanceAdj.set(s, []);
        inheritanceAdj.get(s)!.push(t);

        // Semantics check: Class implementing a Class instead of an Interface
        if (r.type === 'IMPLEMENTATION' && classNames.has(t) && !interfaceNames.has(t)) {
          score -= 2;
          feedback.push({
            id: `fb-impl-class-${s}-${t}`,
            category: 'STRUCTURAL_INTEGRITY',
            severity: 'WARNING',
            title: `Interface Implementation Target is Concrete Class: ${t}`,
            explanation: `Class "${s}" declares an IMPLEMENTATION relationship to "${t}", but "${t}" is declared as a concrete class rather than an interface.`,
            evidence: `Target "${t}" is in the Classes list, not the Interfaces list.`,
            recommendation: `Change the relationship to INHERITANCE (extends) or convert "${t}" into an Interface if it defines a polymorphic contract.`
          });
        }
      }
    }

    // Cycle detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    let hasCycle = false;
    const cycleNodes: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      const neighbors = inheritanceAdj.get(node) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          if (dfs(n)) return true;
        } else if (recStack.has(n)) {
          hasCycle = true;
          cycleNodes.push(node, n);
          return true;
        }
      }
      recStack.delete(node);
      return false;
    };

    for (const node of allEntityNames) {
      if (!visited.has(node)) {
        if (dfs(node)) break;
      }
    }

    if (hasCycle) {
      score = 0;
      feedback.push({
        id: 'fb-inheritance-cycle',
        category: 'STRUCTURAL_INTEGRITY',
        severity: 'CRITICAL',
        title: 'Circular Inheritance Hierarchy Detected',
        explanation: `A cycle was discovered in the type inheritance hierarchy involving ${cycleNodes.join(' <-> ')}. Circular type hierarchies make instantiation impossible and violate core object model invariants.`,
        evidence: `Cycle detected along path: ${cycleNodes.join(' -> ')}`,
        recommendation: 'Break the cyclic dependency by using composition or extracting a shared base interface.'
      });
    }

    // Strengths
    if (danglingRelationships.length === 0 && duplicates.length === 0 && !hasCycle && design.classes.length > 0) {
      feedback.push({
        id: 'fb-struct-valid',
        category: 'STRUCTURAL_INTEGRITY',
        severity: 'INFO',
        title: 'Clean Structural Model',
        explanation: 'All declared classes, interfaces, and relationships have valid references, unique identifiers, and an acyclic hierarchy.',
        evidence: `${design.classes.length} classes, ${design.interfaces.length} interfaces, ${design.relationships.length} relationships validated.`,
        recommendation: 'Keep maintaining clear separation of abstraction layers as the model expands.'
      });
    }

    const finalScore = Math.max(0, Math.min(this.maxScore, score));
    return {
      ruleId: this.id,
      ruleName: this.name,
      category: this.category,
      score: finalScore,
      maxScore: this.maxScore,
      passed: finalScore >= this.maxScore * 0.7 && danglingRelationships.length === 0 && !hasCycle && duplicates.length === 0,
      metrics: {
        totalEntities: allEntityNames.size,
        danglingRelationshipsCount: danglingRelationships.length,
        hasCycle: hasCycle ? 'Yes' : 'No'
      },
      feedback
    };
  }
}
