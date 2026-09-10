import { SemanticEvaluator } from './semantic-evaluator.interface.js';
import { EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, SemanticFeedbackReport } from '../../../shared/types.js';

export class MockSemanticEvaluator implements SemanticEvaluator {
  readonly name = 'Dynamic Heuristic Evaluator (Offline Mode)';
  readonly type = 'HYBRID_MOCK' as const;

  async evaluate(context: EvaluationContext, ruleResults: RuleEvaluationResult[]): Promise<SemanticFeedbackReport> {
    const { problem, design } = context;

    const strengths: string[] = [];
    const areasForImprovement: string[] = [];
    const alternativeDesigns: string[] = [];

    const totalClasses = design.classes.length;
    const totalInterfaces = design.interfaces.length;
    const totalEntities = totalClasses + totalInterfaces;

    // 1. Empty Design Guard
    if (totalEntities === 0) {
      return {
        qualitativeSummary: `No domain entities or interfaces have been declared for "${problem.title}". An object-oriented architecture requires identifying the core concepts, actors, and behavioral contracts.`,
        strengths: [],
        areasForImprovement: [
          'Declare domain classes corresponding to the physical or logical entities of the problem.',
          'Define operational methods to fulfill functional requirements.',
          'Establish relationships (Composition, Aggregation, Inheritance) between entities.'
        ],
        tradeoffCritique: 'No architectural trade-offs could be evaluated because no design has been submitted.',
        alternativeDesigns: [
          'Canonical Decomposition: Identify the primary coordinator, domain aggregates, value objects, and pluggable strategies.'
        ],
        patternAnalysis: 'No design patterns applied.',
        extensibilityVerdict: 'Architecture is absent.',
        semanticScore: 0
      };
    }

    // 2. Domain-Specific Entity Heuristics
    let domainScore = 0;
    const allEntityNames = [
      ...design.classes.map((c) => c.name.toLowerCase()),
      ...design.interfaces.map((i) => i.name.toLowerCase())
    ];

    const slug = problem.slug.toLowerCase();
    if (slug.includes('parking')) {
      const hasCoordinator = allEntityNames.some((n) => /lot|facility|garage|coordinator|system/i.test(n));
      const hasSpot = allEntityNames.some((n) => /spot|slot|bay|space/i.test(n));
      const hasTicket = allEntityNames.some((n) => /ticket|receipt|pass|record|entry/i.test(n));
      const hasPricing = allEntityNames.some((n) => /fee|price|pricing|rate|bill|calculator|strategy/i.test(n));
      const hasDisplay = allEntityNames.some((n) => /display|board|gate|terminal|sensor/i.test(n));

      if (hasCoordinator) domainScore += 6;
      if (hasSpot) domainScore += 8;
      if (hasTicket) domainScore += 6;
      if (hasPricing) domainScore += 6;
      if (hasDisplay) domainScore += 4;

      if (!hasSpot) areasForImprovement.push('Missing explicit Parking Spot/Slot entity to represent physical parking spaces.');
      if (!hasPricing) areasForImprovement.push('Missing dedicated Pricing/Fee Calculation abstraction to isolate hourly rate rules.');
    } else if (slug.includes('elevator')) {
      const hasCar = allEntityNames.some((n) => /car|elevator|cabin/i.test(n));
      const hasDispatcher = allEntityNames.some((n) => /dispatcher|controller|system|manager/i.test(n));
      const hasRequest = allEntityNames.some((n) => /request|call|button|hall/i.test(n));
      const hasFloor = allEntityNames.some((n) => /floor|building/i.test(n));

      if (hasCar) domainScore += 8;
      if (hasDispatcher) domainScore += 8;
      if (hasRequest) domainScore += 8;
      if (hasFloor) domainScore += 6;

      if (!hasDispatcher) areasForImprovement.push('Missing central Dispatcher or Scheduling strategy to coordinate multi-elevator dispatching.');
    } else if (slug.includes('splitwise') || slug.includes('expense')) {
      const hasExpense = allEntityNames.some((n) => /expense|transaction|payment/i.test(n));
      const hasUser = allEntityNames.some((n) => /user|member|account/i.test(n));
      const hasSplit = allEntityNames.some((n) => /split|share|allocation|percentage/i.test(n));
      const hasGroup = allEntityNames.some((n) => /group|ledger|balance/i.test(n));

      if (hasExpense) domainScore += 8;
      if (hasUser) domainScore += 8;
      if (hasSplit) domainScore += 8;
      if (hasGroup) domainScore += 6;

      if (!hasSplit) areasForImprovement.push('Missing Split Strategy (e.g. Equal, Percentage, Exact) to model split variations.');
    } else {
      domainScore = Math.min(30, totalClasses * 6);
    }

    // 3. Granularity & God Class Assessment
    let godClassDetected = false;
    for (const cls of design.classes) {
      if (cls.methods.length > 7 || (cls.methods.length > 5 && cls.attributes.length > 6)) {
        godClassDetected = true;
        areasForImprovement.push(
          `Class "${cls.name}" exhibits God Class tendencies (${cls.methods.length} methods, ${cls.attributes.length} attributes). Decompose it by extracting sub-services.`
        );
      }
    }

    if (totalClasses === 1) {
      domainScore = Math.min(10, domainScore);
      areasForImprovement.push('Monolithic Single-Class Architecture: The entire system is housed in a single class without modular decomposition.');
    } else if (totalClasses >= 3 && !godClassDetected) {
      strengths.push(
        `Balanced object decomposition across ${totalClasses} classes, maintaining clear single-purpose responsibilities.`
      );
    }

    // 4. Abstraction & Extensibility (up to 30 pts)
    let abstractionScore = 0;
    const hasInterfaces = totalInterfaces > 0;
    const hasPolyRelationships = design.relationships.some(
      (r) => r.type === 'IMPLEMENTATION' || r.type === 'INHERITANCE'
    );

    if (hasInterfaces && hasPolyRelationships) {
      abstractionScore += 18;
      strengths.push(
        `Effective contract-based design using ${totalInterfaces} interface(s) to decouple core coordination from implementation details.`
      );
    } else if (hasInterfaces) {
      abstractionScore += 10;
      areasForImprovement.push('Interfaces are declared but lack explicit IMPLEMENTATION relationships from concrete classes.');
    } else if (totalClasses > 1) {
      areasForImprovement.push('No polymorphic abstractions: System relies on concrete classes, making it rigid when requirements change.');
    }

    if (design.patternsApplied.length > 0) {
      abstractionScore += 12;
      const patternNames = design.patternsApplied.map((p) => p.pattern).join(', ');
      strengths.push(`Applied recognized design pattern(s) (${patternNames}) to encapsulate behavioral variations.`);
    }

    // 5. Trade-off Quality Analysis (up to 20 pts)
    let tradeoffScore = 0;
    const userTradeoffs = (design.tradeoffs || '').trim();
    const architecturalKeywords = [
      'composition',
      'inheritance',
      'polymorphism',
      'decoupling',
      'coupling',
      'cohesion',
      'concurrency',
      'latency',
      'throughput',
      'overhead',
      'scalability',
      'maintainability',
      'extensibility',
      'simplicity',
      'encapsulation',
      'strategy',
      'state',
      'observer'
    ];

    const matchedKeywords = architecturalKeywords.filter((kw) =>
      userTradeoffs.toLowerCase().includes(kw)
    );

    let tradeoffCritique = '';
    if (userTradeoffs.length > 40 && matchedKeywords.length >= 2) {
      tradeoffScore = 20;
      tradeoffCritique = `High-quality trade-off reasoning: You analyzed architectural forces (${matchedKeywords.join(', ')}). Acknowledging trade-offs demonstrates senior engineering maturity.`;
      strengths.push('Demonstrated strong engineering judgment with justified trade-offs and alternative evaluations.');
    } else if (userTradeoffs.length > 15) {
      tradeoffScore = 10;
      tradeoffCritique =
        'Trade-off explanation is introductory. Frame your rationale around specific engineering trade-offs (e.g. composition vs inheritance, memory footprint vs decoupling, runtime flexibility vs compile-time safety).';
      areasForImprovement.push('Strengthen trade-offs by explicitly discussing rejected design alternatives.');
    } else {
      tradeoffScore = 3;
      tradeoffCritique =
        'Trade-off analysis is minimal or absent. In senior low-level design assessments, justifying why a pattern was chosen and what compromises were made is critical.';
      areasForImprovement.push('Provide trade-off analysis explaining why you chose your specific abstractions.');
    }

    // 6. Extensibility Explanation (up to 20 pts)
    let extensibilityScore = 0;
    const userExt = (design.extensibilityExplanation || '').trim();
    if (userExt.length > 40) {
      extensibilityScore = 20;
    } else if (userExt.length > 15) {
      extensibilityScore = 10;
    } else {
      extensibilityScore = 3;
    }

    const extensibilityVerdict = userExt.length > 20
      ? `Extensibility plan clearly identifies expansion vectors: "${userExt}".`
      : 'Extensibility is under-specified. Clarify how new requirements (e.g. alternative algorithms, new entity types) can be added without altering existing code.';

    // 7. Contextual Alternative Designs
    if (slug.includes('parking')) {
      if (design.patternsApplied.some((p) => p.pattern.toLowerCase().includes('strategy'))) {
        alternativeDesigns.push(
          'Alternative: State Pattern for Spot Lifecycle — Instead of boolean isOccupied flags, model ParkingSlot with AvailableSlotState, OccupiedSlotState, and ReservedSlotState to encapsulate transition guards.'
        );
      } else {
        alternativeDesigns.push(
          'Alternative: Strategy Pattern for Dynamic Pricing — Decouple fee calculations behind an IFeeCalculationStrategy (HourlyFeeStrategy, SurgeFeeStrategy, WeekendFeeStrategy).'
        );
      }
      alternativeDesigns.push(
        'Alternative: Event-Driven Gate Publisher — Emit VehicleParkedEvent and VehicleExitedEvent through an observer channel so display boards and billing react asynchronously.'
      );
    } else if (slug.includes('elevator')) {
      alternativeDesigns.push(
        'Alternative: State Pattern for Car Motion — Encapsulate MovingUp, MovingDown, and Idle states in dedicated classes to eliminate conditional checks in ElevatorCar.'
      );
      alternativeDesigns.push(
        'Alternative: Destination Dispatching Strategy — Group passengers by destination floors at call time rather than conventional SCAN/LOOK elevator movement.'
      );
    } else {
      alternativeDesigns.push(
        'Alternative: Strategy Pattern — Decouple algorithms from execution context behind a common interface.'
      );
      alternativeDesigns.push(
        'Alternative: Observer Pattern — Decouple state change notifications from consumer display boards.'
      );
    }

    const rawSemanticScore = domainScore + abstractionScore + tradeoffScore + extensibilityScore;
    const finalSemanticScore = Math.min(100, Math.max(0, rawSemanticScore));

    const qualitativeSummary = `Design demonstrates a ${
      finalSemanticScore >= 80 ? 'well-architected, modular' : finalSemanticScore >= 50 ? 'serviceable' : 'nascent'
    } approach to "${problem.title}". ${
      strengths.length > 0 ? strengths[0] : 'Basic class definitions are present.'
    } Primary priority: ${areasForImprovement.length > 0 ? areasForImprovement[0] : 'Refine class contracts.'}`;

    const patternAnalysis = design.patternsApplied.length > 0
      ? `Applied patterns: ${design.patternsApplied.map((p) => `${p.pattern} (applied to: ${p.appliedTo.join(', ')})`).join('; ')}.`
      : 'No formal design patterns documented. Consider where behavioral patterns like Strategy or State would isolate changes.';

    return {
      qualitativeSummary,
      strengths,
      areasForImprovement,
      tradeoffCritique,
      alternativeDesigns,
      patternAnalysis,
      extensibilityVerdict,
      semanticScore: finalSemanticScore
    };
  }
}
