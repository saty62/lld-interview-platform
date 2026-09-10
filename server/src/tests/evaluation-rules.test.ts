import { describe, it, expect } from 'vitest';
import { RelationshipIntegrityRule } from '../domain/rules/relationship-integrity.rule.js';
import { ClassSizeAndCohesionRule } from '../domain/rules/class-size-cohesion.rule.js';
import { CouplingMetricsRule } from '../domain/rules/coupling-metrics.rule.js';
import { RequirementsCoverageRule } from '../domain/rules/requirements-coverage.rule.js';
import { SolidPrinciplesRule } from '../domain/rules/solid-principles.rule.js';
import { SEED_PROBLEMS } from '../infrastructure/seed-problems.js';
import { Design, Problem } from '../../shared/types.js';

describe('Deterministic Evaluation Rules', () => {
  const problem: Problem = SEED_PROBLEMS[0]; // Parking Lot

  describe('RelationshipIntegrityRule', () => {
    const rule = new RelationshipIntegrityRule();

    it('catches dangling relationship references', async () => {
      const design: Design = {
        classes: [{ id: '1', name: 'ParkingLot', responsibility: 'Coordinates lot', attributes: [], methods: [] }],
        interfaces: [],
        relationships: [
          { id: 'r1', source: 'ParkingLot', target: 'NonExistentSpot', type: 'COMPOSITION' }
        ],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.passed).toBe(false);
      expect(result.feedback.some((f) => f.severity === 'CRITICAL' && f.title.includes('Dangling'))).toBe(true);
    });

    it('catches duplicate entity declarations', async () => {
      const design: Design = {
        classes: [
          { id: '1', name: 'Vehicle', responsibility: 'Represents car', attributes: [], methods: [] },
          { id: '2', name: 'Vehicle', responsibility: 'Duplicate car', attributes: [], methods: [] }
        ],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.severity === 'CRITICAL' && f.title.includes('Duplicate'))).toBe(true);
    });

    it('catches cyclic inheritance hierarchies', async () => {
      const design: Design = {
        classes: [
          { id: '1', name: 'NodeA', responsibility: 'Node A', attributes: [], methods: [] },
          { id: '2', name: 'NodeB', responsibility: 'Node B', attributes: [], methods: [] }
        ],
        interfaces: [],
        relationships: [
          { id: 'r1', source: 'NodeA', target: 'NodeB', type: 'INHERITANCE' },
          { id: 'r2', source: 'NodeB', target: 'NodeA', type: 'INHERITANCE' }
        ],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.title.includes('Circular'))).toBe(true);
    });
  });

  describe('ClassSizeAndCohesionRule', () => {
    const rule = new ClassSizeAndCohesionRule();

    it('flags God Classes with excessive method counts', async () => {
      const methods = Array.from({ length: 9 }, (_, i) => ({
        name: `doOperation${i}`,
        returnType: 'void',
        parameters: ''
      }));

      const design: Design = {
        classes: [
          {
            id: '1',
            name: 'GodParkingLotManager',
            responsibility: 'Manages entire parking lot, gates, billing, display, and sensors',
            attributes: [],
            methods
          }
        ],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.title.includes('God Class'))).toBe(true);
    });

    it('flags classes with missing or empty responsibilities', async () => {
      const design: Design = {
        classes: [
          {
            id: '1',
            name: 'VagueClass',
            responsibility: '',
            attributes: [],
            methods: [{ name: 'run', returnType: 'void', parameters: '' }]
          }
        ],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.title.includes('Vague or Missing Responsibility'))).toBe(true);
    });
  });

  describe('CouplingMetricsRule', () => {
    const rule = new CouplingMetricsRule();

    it('detects bidirectional dependencies between two concrete classes', async () => {
      const design: Design = {
        classes: [
          { id: '1', name: 'OrderService', responsibility: 'Orders', attributes: [], methods: [] },
          { id: '2', name: 'PaymentService', responsibility: 'Payments', attributes: [], methods: [] }
        ],
        interfaces: [],
        relationships: [
          { id: 'r1', source: 'OrderService', target: 'PaymentService', type: 'DEPENDENCY' },
          { id: 'r2', source: 'PaymentService', target: 'OrderService', type: 'DEPENDENCY' }
        ],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.title.includes('Bidirectional Concrete Coupling'))).toBe(true);
    });
  });

  describe('RequirementsCoverageRule', () => {
    const rule = new RequirementsCoverageRule();

    it('recognizes requirement coverage regardless of arbitrary class naming', async () => {
      // Learner uses different class names than canonical: e.g. "GarageCoordinator", "Bay", "ChargePolicy"
      const design: Design = {
        classes: [
          {
            id: '1',
            name: 'GarageCoordinator',
            responsibility: 'Manages bay allocation for vehicles, tickets at arrival, and live floor display board updates',
            attributes: [],
            methods: [
              { name: 'allocateBay', returnType: 'Ticket', parameters: 'vehicle: Vehicle' },
              { name: 'processExit', returnType: 'void', parameters: 'ticket: Ticket' }
            ]
          },
          {
            id: '2',
            name: 'Bay',
            responsibility: 'Physical vehicle slot space with status management (vacant, occupied, maintenance)',
            attributes: [],
            methods: [
              { name: 'occupy', returnType: 'void', parameters: '' },
              { name: 'release', returnType: 'void', parameters: '' }
            ]
          },
          {
            id: '3',
            name: 'DynamicFeePolicy',
            responsibility: 'Calculates parking payment fee duration pricing',
            attributes: [],
            methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'durationHours: number' }]
          }
        ],
        interfaces: [],
        relationships: [
          { id: 'r1', source: 'GarageCoordinator', target: 'Bay', type: 'COMPOSITION' },
          { id: 'r2', source: 'GarageCoordinator', target: 'DynamicFeePolicy', type: 'DEPENDENCY' }
        ],
        patternsApplied: [{ pattern: 'Strategy Pattern', appliedTo: ['DynamicFeePolicy'], justification: 'Pluggable pricing policy' }],
        assumptions: ['Multi-floor bay layout'],
        tradeoffs: 'Decoupled pricing from gate controller',
        extensibilityExplanation: 'Can introduce new fee policies easily'
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(18); // out of 25
      expect(result.metrics.coveredRequirements).toBeGreaterThanOrEqual(4);
    });
  });

  describe('SolidPrinciplesRule', () => {
    const rule = new SolidPrinciplesRule();

    it('flags rigid concrete-only designs lacking interface abstraction', async () => {
      const design: Design = {
        classes: [
          { id: '1', name: 'ClassA', responsibility: 'Resp A', attributes: [], methods: [] },
          { id: '2', name: 'ClassB', responsibility: 'Resp B', attributes: [], methods: [] },
          { id: '3', name: 'ClassC', responsibility: 'Resp C', attributes: [], methods: [] }
        ],
        interfaces: [],
        relationships: [
          { id: 'r1', source: 'ClassA', target: 'ClassB', type: 'COMPOSITION' },
          { id: 'r2', source: 'ClassB', target: 'ClassC', type: 'ASSOCIATION' }
        ],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.title.includes('Rigid Architecture'))).toBe(true);
    });

    it('flags single-class monolithic architectures for lack of extensibility', async () => {
      const design: Design = {
        classes: [{ id: '1', name: 'Monolith', responsibility: 'Does everything', attributes: [], methods: [] }],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };

      const result = await rule.evaluate({ problem, design });
      expect(result.feedback.some((f) => f.title.includes('Monolithic Non-Extensible Architecture'))).toBe(true);
      expect(result.score).toBeLessThanOrEqual(7); // heavily penalized
    });
  });

  describe('Edge cases: Empty Models & Monolithic Failures', () => {
    it('RelationshipIntegrityRule assigns score 0 on empty designs', async () => {
      const rule = new RelationshipIntegrityRule();
      const emptyDesign: Design = {
        classes: [],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };
      const result = await rule.evaluate({ problem, design: emptyDesign });
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.feedback.some((f) => f.severity === 'CRITICAL')).toBe(true);
    });

    it('RelationshipIntegrityRule assigns score 0 on cyclic inheritance', async () => {
      const rule = new RelationshipIntegrityRule();
      const cyclicDesign: Design = {
        classes: [
          { id: '1', name: 'A', responsibility: 'Node A', attributes: [], methods: [] },
          { id: '2', name: 'B', responsibility: 'Node B', attributes: [], methods: [] }
        ],
        interfaces: [],
        relationships: [
          { id: 'r1', source: 'A', target: 'B', type: 'INHERITANCE' },
          { id: 'r2', source: 'B', target: 'A', type: 'INHERITANCE' }
        ],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };
      const result = await rule.evaluate({ problem, design: cyclicDesign });
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.feedback.some((f) => f.severity === 'CRITICAL' && f.title.includes('Circular'))).toBe(true);
    });

    it('ClassSizeAndCohesionRule assigns score 0 and CRITICAL finding for single monolithic God class', async () => {
      const rule = new ClassSizeAndCohesionRule();
      const godClassDesign: Design = {
        classes: [
          {
            id: '1',
            name: 'GodClass',
            responsibility: 'Handles everything across the system',
            attributes: [
              { name: 'a1', type: 'string' },
              { name: 'a2', type: 'string' },
              { name: 'a3', type: 'string' },
              { name: 'a4', type: 'string' },
              { name: 'a5', type: 'string' },
              { name: 'a6', type: 'string' },
              { name: 'a7', type: 'string' }
            ],
            methods: [
              { name: 'm1', returnType: 'void', parameters: '' },
              { name: 'm2', returnType: 'void', parameters: '' },
              { name: 'm3', returnType: 'void', parameters: '' },
              { name: 'm4', returnType: 'void', parameters: '' },
              { name: 'm5', returnType: 'void', parameters: '' },
              { name: 'm6', returnType: 'void', parameters: '' },
              { name: 'm7', returnType: 'void', parameters: '' },
              { name: 'm8', returnType: 'void', parameters: '' }
            ]
          }
        ],
        interfaces: [],
        relationships: [],
        patternsApplied: [],
        assumptions: [],
        tradeoffs: '',
        extensibilityExplanation: ''
      };
      const result = await rule.evaluate({ problem, design: godClassDesign });
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.feedback.some((f) => f.severity === 'CRITICAL' && f.title.includes('Monolithic God Class'))).toBe(true);
    });
  });
});
