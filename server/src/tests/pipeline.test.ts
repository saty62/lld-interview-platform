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

describe('EvaluationPipeline & Multiple Valid Solutions', () => {
  const problem = SEED_PROBLEMS[0]; // Parking Lot
  const rules = [
    new RequirementsCoverageRule(),
    new ClassSizeAndCohesionRule(),
    new CouplingMetricsRule(),
    new RelationshipIntegrityRule(),
    new SolidPrinciplesRule()
  ];
  const pipeline = new EvaluationPipeline(rules, new MockSemanticEvaluator());

  it('fairly evaluates Solution A: Deep Polymorphic Spot Hierarchy', async () => {
    const solutionA: Design = {
      classes: [
        {
          id: 'c1',
          name: 'ParkingLot',
          responsibility: 'Coordinates multiple floors and delegates ticket issuance at entry/exit gates',
          attributes: [{ name: 'floors', type: 'List<Floor>', visibility: 'private' }],
          methods: [
            { name: 'parkVehicle', returnType: 'Ticket', parameters: 'vehicle: Vehicle' },
            { name: 'processExit', returnType: 'void', parameters: 'ticket: Ticket' }
          ]
        },
        {
          id: 'c2',
          name: 'ParkingSpot',
          isAbstract: true,
          responsibility: 'Abstract base spot managing availability state, spot size, and vacancy',
          attributes: [{ name: 'isOccupied', type: 'boolean', visibility: 'protected' }],
          methods: [
            { name: 'assign', returnType: 'void', parameters: 'vehicle: Vehicle' },
            { name: 'release', returnType: 'void', parameters: '' }
          ]
        },
        {
          id: 'c3',
          name: 'ElectricSpot',
          responsibility: 'Specialized parking spot equipped with EV charging dock station',
          attributes: [{ name: 'chargerKwh', type: 'number', visibility: 'private' }],
          methods: [{ name: 'startCharging', returnType: 'void', parameters: '' }]
        },
        {
          id: 'c4',
          name: 'Ticket',
          responsibility: 'Immutable parking receipt recording arrival timestamp and assigned spot',
          attributes: [{ name: 'issuedAt', type: 'DateTime', visibility: 'private' }],
          methods: [{ name: 'getDurationHours', returnType: 'number', parameters: '' }]
        },
        {
          id: 'c5',
          name: 'FeeCalculator',
          responsibility: 'Computes total price based on duration, parking tier, and vehicle rate',
          attributes: [],
          methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'ticket: Ticket' }]
        },
        {
          id: 'c6',
          name: 'DisplayBoard',
          responsibility: 'Displays remaining capacity per vehicle tier on each floor in real time',
          attributes: [{ name: 'counts', type: 'Map<string, number>', visibility: 'private' }],
          methods: [{ name: 'updateCounts', returnType: 'void', parameters: 'tier: string, delta: number' }]
        }
      ],
      interfaces: [
        {
          id: 'i1',
          name: 'IFeeCalculator',
          responsibility: 'Contract for calculating parking fee from ticket duration',
          methods: [{ name: 'calculateFee', returnType: 'number', parameters: 'ticket: Ticket' }]
        }
      ],
      relationships: [
        { id: 'r1', source: 'ParkingLot', target: 'ParkingSpot', type: 'COMPOSITION' },
        { id: 'r2', source: 'ElectricSpot', target: 'ParkingSpot', type: 'INHERITANCE' },
        { id: 'r3', source: 'ParkingLot', target: 'Ticket', type: 'DEPENDENCY' },
        { id: 'r4', source: 'FeeCalculator', target: 'IFeeCalculator', type: 'IMPLEMENTATION' },
        { id: 'r5', source: 'ParkingLot', target: 'IFeeCalculator', type: 'DEPENDENCY' },
        { id: 'r6', source: 'ParkingLot', target: 'DisplayBoard', type: 'COMPOSITION' }
      ],
      patternsApplied: [
        { pattern: 'Strategy Pattern', appliedTo: ['IFeeCalculator', 'FeeCalculator'], justification: 'Pluggable fee policies' },
        { pattern: 'Factory Pattern', appliedTo: ['ParkingSpot', 'ElectricSpot'], justification: 'Instantiation of spot types' }
      ],
      assumptions: ['Sensors automatically notify gates when car arrives'],
      tradeoffs: 'Used inheritance for spot types because EV charging has distinct hardware behavior',
      extensibilityExplanation: 'New spot types (e.g. Valet, Ambulance) can subclass ParkingSpot without changing ParkingLot controller.'
    };

    const evalA = await pipeline.execute('test-att-A', problem, solutionA);
    expect(evalA.overallScore).toBeGreaterThanOrEqual(80);
    expect(['EXEMPLARY', 'PROFICIENT']).toContain(evalA.qualitativeLevel);
    expect(evalA.scoreDimensions.find((d) => d.key === 'REQUIREMENTS_COVERAGE')?.percentage).toBeGreaterThanOrEqual(80);
  });

  it('fairly evaluates Solution B: Flat Composition & Strategy Pattern with completely different names', async () => {
    // Solution B uses flat composition: "GarageManager", "Slot", "SlotAllocationStrategy", "BillingStrategy"
    const solutionB: Design = {
      classes: [
        {
          id: 'c10',
          name: 'GarageManager',
          responsibility: 'Orchestrates vehicle check-in, check-out, ticket issuance, and floor capacity display',
          attributes: [{ name: 'slots', type: 'Map<string, Slot>', visibility: 'private' }],
          methods: [
            { name: 'checkInVehicle', returnType: 'Ticket', parameters: 'vehicle: Vehicle' },
            { name: 'checkOutVehicle', returnType: 'void', parameters: 'ticket: Ticket' }
          ]
        },
        {
          id: 'c11',
          name: 'Slot',
          responsibility: 'Physical space holding vehicle slot tier and status (available, occupied, maintenance)',
          attributes: [
            { name: 'slotNumber', type: 'string', visibility: 'private' },
            { name: 'status', type: 'SlotStatus', visibility: 'private' }
          ],
          methods: [
            { name: 'occupySlot', returnType: 'void', parameters: '' },
            { name: 'vacateSlot', returnType: 'void', parameters: '' }
          ]
        },
        {
          id: 'c12',
          name: 'Ticket',
          responsibility: 'Records arrival time, slot location, and vehicle identifier',
          attributes: [{ name: 'entryTime', type: 'DateTime', visibility: 'private' }],
          methods: [{ name: 'computeDuration', returnType: 'number', parameters: '' }]
        },
        {
          id: 'c13',
          name: 'HourlyBillingStrategy',
          responsibility: 'Implements pricing fee calculation based on duration and vehicle tier',
          attributes: [],
          methods: [{ name: 'computeFee', returnType: 'number', parameters: 'ticket: Ticket' }]
        },
        {
          id: 'c14',
          name: 'NearestSlotAllocationStrategy',
          responsibility: 'Allocates the nearest available slot matching the incoming vehicle size',
          attributes: [],
          methods: [{ name: 'findBestSlot', returnType: 'Slot', parameters: 'vehicle: Vehicle' }]
        },
        {
          id: 'c15',
          name: 'CapacityDisplayBoard',
          responsibility: 'Monitors real-time capacity and updates availability per floor',
          attributes: [],
          methods: [{ name: 'displayAvailable', returnType: 'void', parameters: 'floor: number, count: number' }]
        }
      ],
      interfaces: [
        {
          id: 'i10',
          name: 'IBillingStrategy',
          responsibility: 'Contract for computing parking payment fees',
          methods: [{ name: 'computeFee', returnType: 'number', parameters: 'ticket: Ticket' }]
        },
        {
          id: 'i11',
          name: 'ISlotAllocationStrategy',
          responsibility: 'Contract for finding and assigning suitable slots',
          methods: [{ name: 'findBestSlot', returnType: 'Slot', parameters: 'vehicle: Vehicle' }]
        }
      ],
      relationships: [
        { id: 'r10', source: 'GarageManager', target: 'Slot', type: 'COMPOSITION' },
        { id: 'r11', source: 'GarageManager', target: 'IBillingStrategy', type: 'DEPENDENCY' },
        { id: 'r12', source: 'HourlyBillingStrategy', target: 'IBillingStrategy', type: 'IMPLEMENTATION' },
        { id: 'r13', source: 'GarageManager', target: 'ISlotAllocationStrategy', type: 'DEPENDENCY' },
        { id: 'r14', source: 'NearestSlotAllocationStrategy', target: 'ISlotAllocationStrategy', type: 'IMPLEMENTATION' },
        { id: 'r15', source: 'GarageManager', target: 'CapacityDisplayBoard', type: 'COMPOSITION' }
      ],
      patternsApplied: [
        { pattern: 'Strategy Pattern', appliedTo: ['IBillingStrategy', 'ISlotAllocationStrategy'], justification: 'Decoupled slot allocation and fee calculation' }
      ],
      assumptions: ['Single facility with multiple levels'],
      tradeoffs: 'Favored composition with strategies over class inheritance to avoid spot subclass explosion',
      extensibilityExplanation: 'Can add SurgeBillingStrategy or EVAllocationStrategy without modifying GarageManager.'
    };

    const evalB = await pipeline.execute('test-att-B', problem, solutionB);
    expect(evalB.overallScore).toBeGreaterThanOrEqual(80);
    expect(['EXEMPLARY', 'PROFICIENT']).toContain(evalB.qualitativeLevel);
    expect(evalB.scoreDimensions.find((d) => d.key === 'REQUIREMENTS_COVERAGE')?.percentage).toBeGreaterThanOrEqual(80);
  });
});
