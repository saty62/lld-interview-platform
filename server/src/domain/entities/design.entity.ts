import {
  Design,
  ClassDefinition,
  InterfaceDefinition,
  RelationshipDefinition,
  PatternUsage
} from '../../../shared/types.js';

export interface StructuralValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DesignMetrics {
  totalClasses: number;
  totalInterfaces: number;
  totalMethods: number;
  totalAttributes: number;
  totalRelationships: number;
  totalPatterns: number;
  averageMethodsPerClass: number;
  hasInterfaceAbstraction: boolean;
}

export class DesignEntity {
  private constructor(private readonly data: Design) {}

  public static create(data: Design): DesignEntity {
    return new DesignEntity({
      classes: data.classes ? [...data.classes] : [],
      interfaces: data.interfaces ? [...data.interfaces] : [],
      relationships: data.relationships ? [...data.relationships] : [],
      patternsApplied: data.patternsApplied ? [...data.patternsApplied] : [],
      assumptions: data.assumptions ? [...data.assumptions] : [],
      tradeoffs: data.tradeoffs || '',
      extensibilityExplanation: data.extensibilityExplanation || ''
    });
  }

  public toJSON(): Design {
    return JSON.parse(JSON.stringify(this.data));
  }

  public get classes(): readonly ClassDefinition[] {
    return this.data.classes;
  }

  public get interfaces(): readonly InterfaceDefinition[] {
    return this.data.interfaces;
  }

  public get relationships(): readonly RelationshipDefinition[] {
    return this.data.relationships;
  }

  public get patternsApplied(): readonly PatternUsage[] {
    return this.data.patternsApplied;
  }

  public get assumptions(): readonly string[] {
    return this.data.assumptions;
  }

  public get tradeoffs(): string {
    return this.data.tradeoffs;
  }

  public get extensibilityExplanation(): string {
    return this.data.extensibilityExplanation;
  }

  public getAllEntityNames(): Set<string> {
    const names = new Set<string>();
    for (const c of this.data.classes) names.add(c.name.trim());
    for (const i of this.data.interfaces) names.add(i.name.trim());
    return names;
  }

  public calculateMetrics(): DesignMetrics {
    const totalClasses = this.data.classes.length;
    const totalInterfaces = this.data.interfaces.length;
    const totalMethods =
      this.data.classes.reduce((sum, c) => sum + c.methods.length, 0) +
      this.data.interfaces.reduce((sum, i) => sum + i.methods.length, 0);
    const totalAttributes = this.data.classes.reduce((sum, c) => sum + c.attributes.length, 0);
    const totalRelationships = this.data.relationships.length;
    const totalPatterns = this.data.patternsApplied.length;
    const averageMethodsPerClass =
      totalClasses > 0
        ? Number((this.data.classes.reduce((sum, c) => sum + c.methods.length, 0) / totalClasses).toFixed(1))
        : 0;

    return {
      totalClasses,
      totalInterfaces,
      totalMethods,
      totalAttributes,
      totalRelationships,
      totalPatterns,
      averageMethodsPerClass,
      hasInterfaceAbstraction: totalInterfaces > 0
    };
  }

  public validateInvariants(): StructuralValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const names = new Set<string>();

    // Invariant 1: Non-empty model
    if (this.data.classes.length === 0 && this.data.interfaces.length === 0) {
      errors.push('Design must declare at least one class or interface.');
    }

    // Invariant 2: Unique entity identifiers
    for (const c of this.data.classes) {
      const name = c.name.trim();
      if (!name) errors.push('Class name cannot be blank.');
      if (names.has(name)) errors.push(`Duplicate entity name: "${name}".`);
      names.add(name);
    }
    for (const i of this.data.interfaces) {
      const name = i.name.trim();
      if (!name) errors.push('Interface name cannot be blank.');
      if (names.has(name)) errors.push(`Duplicate entity name: "${name}".`);
      names.add(name);
    }

    // Invariant 3: Relationship endpoint validity
    for (const r of this.data.relationships) {
      const src = r.source.trim();
      const tgt = r.target.trim();
      if (!names.has(src)) errors.push(`Relationship source "${src}" does not exist in declared entities.`);
      if (!names.has(tgt)) errors.push(`Relationship target "${tgt}" does not exist in declared entities.`);
    }

    // Invariant 4: Disconnected islands warning
    if (this.data.classes.length >= 2 && this.data.relationships.length === 0) {
      warnings.push('Design contains multiple classes but zero relationships connecting them.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
