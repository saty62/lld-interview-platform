import { describe, it, expect } from 'vitest';
import { RelationshipIntegrityRule } from '../domain/rules/relationship-integrity.rule.js';
import { ClassSizeAndCohesionRule } from '../domain/rules/class-size-cohesion.rule.js';
import { CouplingMetricsRule } from '../domain/rules/coupling-metrics.rule.js';
import { RequirementsCoverageRule } from '../domain/rules/requirements-coverage.rule.js';
import { SolidPrinciplesRule } from '../domain/rules/solid-principles.rule.js';
import { MockSemanticEvaluator } from '../domain/evaluators/mock-semantic-evaluator.js';
import { EvaluationPipeline } from '../domain/pipeline/evaluation-pipeline.js';
import { SEED_PROBLEMS } from '../infrastructure/seed-problems.js';
import { Design } from '../../shared/types.js';

describe('Design Archetypes Evaluation (Rubric Section 3)', () => {
  const problem = SEED_PROBLEMS[0]; // Parking Lot
  const rules = [
    new RequirementsCoverageRule(),
    new ClassSizeAndCohesionRule(),
    new CouplingMetricsRule(),
    new RelationshipIntegrityRule(),
    new SolidPrinciplesRule()
  ];
  const pipeline = new EvaluationPipeline(rules, new MockSemanticEvaluator());

  // 1. GOOD DESIGN
  it('evaluates Profile 1: A Good Design with high score and praise', async () => {
    const goodDesign: Design = {
      classes: [
        {
          id: 'c1',
          name: 'ParkingLot',
          responsibility: 'Coordinates entry and exit terminals, spot allocation, and ticketing',
          attributes: [{ name: 'id', type: 'string', visibility: 'private' }],
          methods: [
            { name: 'parkVehicle', returnType: 'Ticket', parameters: 'vehicle: Vehicle' },
            { name: 'processExit', returnType: 'void', parameters: 'ticket: Ticket' }
          ]
        },
        {
          id: 'c2',
          name: 'ParkingSpot',
          isAbstract: true,
          responsibility: 'Base spot tracking occupancy state, size tier, and vehicle assignment',
          attributes: [{ name: 'isOccupied', type: 'boolean', visibility: 'protected' }],
          methods: [
            { name: 'assign', returnType: 'void', parameters: 'vehicle: Vehicle' },
            { name: 'release', returnType: 'void', parameters: '' }
          ]
        },
        {
          id: 'c3',
          name: 'Ticket',
          responsibility: 'Immutable receipt capturing entry timestamp and assigned spot',
          attributes: [{ name: 'entryTime', type: 'DateTime', visibility: 'private' }],
          methods: [{ name: 'getDuration', returnType: 'number', parameters: '' }]
        },
        {
          id: 'c4',
          name: 'HourlyFeePolicy',
          responsibility: 'Calculates parking fee based on duration and vehicle tier rate',
          attributes: [],
          methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'ticket: Ticket' }]
        },
        {
          id: 'c5',
          name: 'DisplayBoard',
          responsibility: 'Tracks real-time floor capacity and displays spot availability',
          attributes: [{ name: 'boardId', type: 'string', visibility: 'private' }],
          methods: [{ name: 'updateCount', returnType: 'void', parameters: 'tier: string, delta: number' }]
        }
      ],
      interfaces: [
        {
          id: 'i1',
          name: 'IFeePolicy',
          responsibility: 'Contract for extensible pricing algorithms',
          methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'ticket: Ticket' }]
        }
      ],
      relationships: [
        { id: 'r1', source: 'ParkingLot', target: 'ParkingSpot', type: 'COMPOSITION' },
        { id: 'r2', source: 'HourlyFeePolicy', target: 'IFeePolicy', type: 'IMPLEMENTATION' },
        { id: 'r3', source: 'ParkingLot', target: 'IFeePolicy', type: 'DEPENDENCY' },
        { id: 'r4', source: 'ParkingLot', target: 'Ticket', type: 'DEPENDENCY' },
        { id: 'r5', source: 'ParkingLot', target: 'DisplayBoard', type: 'COMPOSITION' }
      ],
      patternsApplied: [
        { pattern: 'Strategy Pattern', appliedTo: ['IFeePolicy'], justification: 'Allows swapping hourly and surge pricing' }
      ],
      assumptions: ['Single multi-level facility'],
      tradeoffs: 'Used Strategy pattern to isolate fee calculations from core parking lot',
      extensibilityExplanation: 'Can introduce ValetFeePolicy without modifying ParkingLot class'
    };

    const evaluation = await pipeline.execute('test-good', problem, goodDesign);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(85);
    expect(evaluation.qualitativeLevel).toBe('EXEMPLARY');
    expect(evaluation.feedbackItems.some((f) => f.severity === 'CRITICAL')).toBe(false);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
  });

  // 2. POOR DESIGN (God Class, high coupling, bidirectional dependency)
  it('evaluates Profile 2: A Poor Design with god class and high concrete coupling', async () => {
    const poorDesign: Design = {
      classes: [
        {
          id: 'c1',
          name: 'GodParkingLot',
          responsibility: 'Does everything: coordinates parking, runs database queries, prints tickets, calculates prices, handles credit cards, and controls physical gates',
          attributes: [
            { name: 'dbUrl', type: 'string' },
            { name: 'spots', type: 'any[]' },
            { name: 'cashInDrawer', type: 'number' },
            { name: 'gateStatus', type: 'string' },
            { name: 'sensorReadings', type: 'number[]' },
            { name: 'ticketPrinterState', type: 'string' }
          ],
          methods: [
            { name: 'connectDb', returnType: 'void', parameters: '' },
            { name: 'openGate', returnType: 'void', parameters: '' },
            { name: 'closeGate', returnType: 'void', parameters: '' },
            { name: 'printTicket', returnType: 'void', parameters: '' },
            { name: 'chargeCreditCard', returnType: 'void', parameters: '' },
            { name: 'calculateHourlyPrice', returnType: 'number', parameters: '' },
            { name: 'calculateEVPrice', returnType: 'number', parameters: '' },
            { name: 'updateFloorDisplayHardware', returnType: 'void', parameters: '' }
          ]
        },
        {
          id: 'c2',
          name: 'ConcretePaymentTerminal',
          responsibility: 'Terminal',
          attributes: [],
          methods: [{ name: 'callGodLot', returnType: 'void', parameters: '' }]
        }
      ],
      interfaces: [],
      relationships: [
        { id: 'r1', source: 'GodParkingLot', target: 'ConcretePaymentTerminal', type: 'DEPENDENCY' },
        { id: 'r2', source: 'ConcretePaymentTerminal', target: 'GodParkingLot', type: 'DEPENDENCY' }
      ],
      patternsApplied: [],
      assumptions: [],
      tradeoffs: '',
      extensibilityExplanation: ''
    };

    const evaluation = await pipeline.execute('test-poor', problem, poorDesign);
    expect(evaluation.overallScore).toBeLessThan(65);
    expect(['DEVELOPING', 'NEEDS_IMPROVEMENT']).toContain(evaluation.qualitativeLevel);

    // Assert specific diagnostic findings
    expect(evaluation.feedbackItems.some((f) => f.title.includes('God Class'))).toBe(true);
    expect(evaluation.feedbackItems.some((f) => f.title.includes('Bidirectional Concrete Coupling'))).toBe(true);
    expect(evaluation.feedbackItems.some((f) => f.title.includes('Rigid Architecture'))).toBe(true);
  });

  // 3. STRUCTURALLY DIFFERENT BUT VALID DESIGN
  it('evaluates Profile 3: Structurally Different but Valid Design (Flat Strategy & Allocator)', async () => {
    // Uses completely different names: "FacilityCoordinator", "ParkingBay", "BayAllocator", "DurationBilling"
    const differentValidDesign: Design = {
      classes: [
        {
          id: 'c1',
          name: 'FacilityCoordinator',
          responsibility: 'Handles vehicle arrival, departure, and live capacity board updates',
          attributes: [{ name: 'bays', type: 'Map<string, ParkingBay>' }],
          methods: [
            { name: 'registerVehicleEntry', returnType: 'ParkingPass', parameters: 'vehicle: Vehicle' },
            { name: 'settleVehicleExit', returnType: 'void', parameters: 'pass: ParkingPass' }
          ]
        },
        {
          id: 'c2',
          name: 'ParkingBay',
          responsibility: 'Physical space maintaining availability status, size tier, and vehicle assignment',
          attributes: [{ name: 'status', type: 'BayStatus' }],
          methods: [
            { name: 'occupyBay', returnType: 'void', parameters: '' },
            { name: 'vacateBay', returnType: 'void', parameters: '' }
          ]
        },
        {
          id: 'c3',
          name: 'NearestBayAllocationPolicy',
          responsibility: 'Allocates the closest compatible bay matching incoming vehicle size',
          attributes: [],
          methods: [{ name: 'findBay', returnType: 'ParkingBay', parameters: 'vehicle: Vehicle' }]
        },
        {
          id: 'c4',
          name: 'DurationBillingPolicy',
          responsibility: 'Computes total price fee duration parking payment',
          attributes: [],
          methods: [{ name: 'computeFee', returnType: 'number', parameters: 'pass: ParkingPass' }]
        },
        {
          id: 'c5',
          name: 'OccupancyBoard',
          responsibility: 'Displays floor capacity and real-time spot availability',
          attributes: [],
          methods: [{ name: 'refreshDisplay', returnType: 'void', parameters: 'floor: number' }]
        }
      ],
      interfaces: [
        {
          id: 'i1',
          name: 'IBayAllocationPolicy',
          responsibility: 'Contract for bay assignment algorithms',
          methods: [{ name: 'findBay', returnType: 'ParkingBay', parameters: 'vehicle: Vehicle' }]
        },
        {
          id: 'i2',
          name: 'IBillingPolicy',
          responsibility: 'Contract for fee pricing computation',
          methods: [{ name: 'computeFee', returnType: 'number', parameters: 'pass: ParkingPass' }]
        }
      ],
      relationships: [
        { id: 'r1', source: 'FacilityCoordinator', target: 'ParkingBay', type: 'COMPOSITION' },
        { id: 'r2', source: 'NearestBayAllocationPolicy', target: 'IBayAllocationPolicy', type: 'IMPLEMENTATION' },
        { id: 'r3', source: 'DurationBillingPolicy', target: 'IBillingPolicy', type: 'IMPLEMENTATION' },
        { id: 'r4', source: 'FacilityCoordinator', target: 'IBayAllocationPolicy', type: 'DEPENDENCY' },
        { id: 'r5', source: 'FacilityCoordinator', target: 'IBillingPolicy', type: 'DEPENDENCY' },
        { id: 'r6', source: 'FacilityCoordinator', target: 'OccupancyBoard', type: 'COMPOSITION' }
      ],
      patternsApplied: [
        { pattern: 'Strategy Pattern', appliedTo: ['IBayAllocationPolicy', 'IBillingPolicy'], justification: 'Pluggable bay allocation and fee computation' }
      ],
      assumptions: ['Automated gates connect via API'],
      tradeoffs: 'Decoupled allocation from physical bay classes using Strategy pattern',
      extensibilityExplanation: 'Can introduce VIPAllocationStrategy without modifying FacilityCoordinator'
    };

    const evaluation = await pipeline.execute('test-different-valid', problem, differentValidDesign);
    // Crucial check: must NOT be penalized for using different names
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(80);
    expect(['EXEMPLARY', 'PROFICIENT']).toContain(evaluation.qualitativeLevel);
    expect(evaluation.scoreDimensions.find((d) => d.key === 'REQUIREMENTS_COVERAGE')?.percentage).toBeGreaterThanOrEqual(80);
  });

  // 4. INCOMPLETE DESIGN (Empty or single anemic class)
  it('evaluates Profile 4: An Incomplete Design with poor scores and actionable guidance', async () => {
    const incompleteDesign: Design = {
      classes: [],
      interfaces: [],
      relationships: [],
      patternsApplied: [],
      assumptions: [],
      tradeoffs: '',
      extensibilityExplanation: ''
    };

    const evaluation = await pipeline.execute('test-incomplete', problem, incompleteDesign);
    expect(evaluation.overallScore).toBeLessThan(40);
    expect(evaluation.qualitativeLevel).toBe('NEEDS_IMPROVEMENT');
    expect(evaluation.feedbackItems.some((f) => f.title.includes('No Classes Defined'))).toBe(true);
  });

  // 5. INVALID DESIGN (Dangling references & circular inheritance)
  it('evaluates Profile 5: An Invalid Design with structural defects flagged as CRITICAL', async () => {
    const invalidDesign: Design = {
      classes: [
        { id: '1', name: 'ClassA', responsibility: 'Node A', attributes: [], methods: [] },
        { id: '2', name: 'ClassB', responsibility: 'Node B', attributes: [], methods: [] }
      ],
      interfaces: [],
      relationships: [
        { id: 'r1', source: 'ClassA', target: 'ClassB', type: 'INHERITANCE' },
        { id: 'r2', source: 'ClassB', target: 'ClassA', type: 'INHERITANCE' },
        { id: 'r3', source: 'ClassA', target: 'DanglingTargetGhost', type: 'COMPOSITION' }
      ],
      patternsApplied: [],
      assumptions: [],
      tradeoffs: '',
      extensibilityExplanation: ''
    };

    const evaluation = await pipeline.execute('test-invalid', problem, invalidDesign);
    expect(evaluation.feedbackItems.some((f) => f.severity === 'CRITICAL' && f.title.includes('Circular'))).toBe(true);
    expect(evaluation.feedbackItems.some((f) => f.severity === 'CRITICAL' && f.title.includes('Dangling'))).toBe(true);
  });
});
