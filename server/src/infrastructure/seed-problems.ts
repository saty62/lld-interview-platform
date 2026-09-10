import { Problem } from '../../shared/types.js';

export const SEED_PROBLEMS: Problem[] = [
  {
    id: 'prob-parking-lot',
    slug: 'parking-lot-system',
    title: 'Multi-Floor Automated Parking Lot',
    difficulty: 'MEDIUM',
    estimatedMinutes: 45,
    scenario:
      'Design a robust software architecture for a multi-floor automated parking garage. The facility caters to diverse vehicle types (Motorcycles, Compact Cars, Electric Vehicles, and Heavy Trucks) with multiple entry and exit terminals. The system must support real-time spot availability displays, flexible pricing strategies (hourly, flat, vehicle-dependent), automated ticket issuance, and seamless payment processing.',
    functionalRequirements: [
      {
        id: 'fr-1',
        code: 'FR-1',
        title: 'Multi-Type Spot Allocation',
        description: 'Support diverse spot types (Compact, Regular, EV with charging, Large). Vehicles must only be assigned compatible or appropriately sized spots.',
        weight: 25,
        keyConcepts: ['spot', 'vehicle', 'allocation', 'compatibility', 'slot', 'type']
      },
      {
        id: 'fr-2',
        code: 'FR-2',
        title: 'Entry Terminal & Ticket Issuance',
        description: 'When a vehicle arrives at an entry gate, assign an available spot, generate an immutable Ticket with timestamp, and decrement available spot counts.',
        weight: 20,
        keyConcepts: ['entry', 'gate', 'ticket', 'issue', 'arrival', 'terminal']
      },
      {
        id: 'fr-3',
        code: 'FR-3',
        title: 'Exit Terminal & Dynamic Fee Calculation',
        description: 'At the exit gate, validate the ticket, calculate parking fees based on duration and vehicle tier using a pluggable pricing policy, and process payment.',
        weight: 25,
        keyConcepts: ['exit', 'fee', 'pricing', 'payment', 'calculate', 'duration']
      },
      {
        id: 'fr-4',
        code: 'FR-4',
        title: 'Live Floor Display & Capacity Tracking',
        description: 'Maintain and update live display boards on each floor showing remaining available spots per vehicle category in real time.',
        weight: 15,
        keyConcepts: ['display', 'board', 'observer', 'capacity', 'floor', 'availability']
      },
      {
        id: 'fr-5',
        code: 'FR-5',
        title: 'Spot Status Management',
        description: 'Manage spot life cycle states (Available, Occupied, Reserved, Maintenance) with proper state transition controls.',
        weight: 15,
        keyConcepts: ['status', 'state', 'maintenance', 'occupied', 'vacant', 'release']
      }
    ],
    nonFunctionalRequirements: [
      'Extensibility: New pricing models (e.g., peak-hour surge, loyalty discounts) must be added without modifying core gate classes (Open-Closed Principle).',
      'High Cohesion: Ticketing, fee calculation, and spot search must have distinct, isolated responsibilities.',
      'Thread-Safety: Concurrent entry gates must not allocate the same spot to two different vehicles.'
    ],
    constraints: [
      'A floor has a fixed maximum capacity per spot tier.',
      'Electric vehicles require spots equipped with charging docks.',
      'Vehicles cannot exit without paying or validating a prepaid pass.'
    ],
    useCases: [
      'UC-1: Driver arrives at Gate 2 -> System checks spot availability -> Issues Ticket -> Barrier opens.',
      'UC-2: Driver presents Ticket at Exit 1 -> Pricing strategy computes $14.50 -> Payment processed -> Spot freed -> Display boards updated.'
    ],
    evaluationCriteria: [
      'Clear separation of Spot, Vehicle, Ticket, and Gate domains.',
      'Use of Strategy or Polymorphism for pricing calculation instead of nested switch-case blocks.',
      'Decoupled notification mechanism for floor display boards (e.g., Observer pattern or Event listener).',
      'Low coupling between Entry/Exit terminals and underlying storage.'
    ],
    starterTemplate: {
      classes: [
        {
          id: 'c1',
          name: 'ParkingLot',
          responsibility: 'Coordinates floors and top-level parking operations',
          attributes: [{ name: 'id', type: 'string', visibility: 'private' }],
          methods: [{ name: 'parkVehicle', returnType: 'Ticket', parameters: 'vehicle: Vehicle', visibility: 'public' }]
        },
        {
          id: 'c2',
          name: 'ParkingSpot',
          responsibility: 'Represents a physical parking space with size and state',
          attributes: [
            { name: 'spotNumber', type: 'string', visibility: 'private' },
            { name: 'isOccupied', type: 'boolean', visibility: 'private' }
          ],
          methods: [
            { name: 'assignVehicle', returnType: 'void', parameters: 'vehicle: Vehicle', visibility: 'public' },
            { name: 'vacate', returnType: 'void', parameters: '', visibility: 'public' }
          ]
        }
      ],
      interfaces: [],
      relationships: [
        {
          id: 'r1',
          source: 'ParkingLot',
          target: 'ParkingSpot',
          type: 'COMPOSITION',
          cardinality: '1..*'
        }
      ],
      assumptions: ['Single parking garage facility with multiple floors and gates.'],
      tradeoffs: 'Focusing on modular pricing strategies over complex physical sensor simulations.',
      extensibilityExplanation: 'Can introduce new vehicle types and pricing rules with zero modifications to existing spot allocation logic.'
    },
    domainRubric: {
      coreConcepts: ['Vehicle', 'Spot', 'Ticket', 'Gate', 'PricingStrategy', 'Payment', 'DisplayBoard'],
      acceptablePatterns: ['Strategy Pattern', 'Factory Pattern', 'Observer Pattern', 'State Pattern'],
      antiPatterns: ['God ParkingLot Class managing pricing, gates, and DB', 'Hardcoded if-else vehicle fee checks', 'Direct concrete gate coupling'],
      expectedScenarios: ['Vehicle Entry', 'Vehicle Exit with Fee', 'Spot Availability Updates']
    }
  },
  {
    id: 'prob-elevator-system',
    slug: 'elevator-control-system',
    title: 'Smart Multi-Car Elevator Dispatcher',
    difficulty: 'HARD',
    estimatedMinutes: 60,
    scenario:
      'Design the control software for a bank of 6 high-speed elevators serving a 40-story commercial tower. The system manages internal car button presses (destination floor) and external hall call buttons (up/down). An intelligent dispatch controller must select the most optimal elevator to minimize passenger wait times, optimize energy efficiency, and handle door safety and weight sensors gracefully.',
    functionalRequirements: [
      {
        id: 'fr-e1',
        code: 'FR-1',
        title: 'Hall Calls & Car Calls Handling',
        description: 'Process external hall calls (floor number, direction: UP/DOWN) and internal car requests (destination floor).',
        weight: 20,
        keyConcepts: ['call', 'request', 'hall', 'button', 'destination', 'floor']
      },
      {
        id: 'fr-e2',
        code: 'FR-2',
        title: 'Intelligent Dispatching Strategy',
        description: 'Select the best elevator car for a hall call using a pluggable dispatch algorithm (e.g., LOOK / SCAN / proximity / lowest load).',
        weight: 30,
        keyConcepts: ['dispatch', 'strategy', 'algorithm', 'controller', 'assign', 'scheduler']
      },
      {
        id: 'fr-e3',
        code: 'FR-3',
        title: 'Car Movement & Motion State Transitions',
        description: 'Manage car operational states: MOVING_UP, MOVING_DOWN, IDLE, STOPPED, EMERGENCY_HOLD.',
        weight: 20,
        keyConcepts: ['state', 'movement', 'direction', 'idle', 'moving', 'transition']
      },
      {
        id: 'fr-e4',
        code: 'FR-4',
        title: 'Door Operation & Safety Interlocks',
        description: 'Control door states (OPENING, OPEN, CLOSING, CLOSED) with obstacle detection and overload sensor prevention.',
        weight: 15,
        keyConcepts: ['door', 'sensor', 'safety', 'open', 'close', 'interlock']
      },
      {
        id: 'fr-e5',
        code: 'FR-5',
        title: 'Emergency & Maintenance Override',
        description: 'Allow building operators or fire alarm triggers to place an elevator into maintenance mode or return to ground floor.',
        weight: 15,
        keyConcepts: ['emergency', 'override', 'maintenance', 'alarm', 'fire']
      }
    ],
    nonFunctionalRequirements: [
      'Pluggable Dispatch Algorithm: Must easily swap between SCAN, FCFS, and Destination Dispatch without touching ElevatorCar logic.',
      'Safety: Doors must never open while car state is MOVING.',
      'Extensibility: Support different elevator types (e.g., Freight elevator with weight restrictions, Service elevator).'
    ],
    constraints: [
      'Maximum weight capacity per car must be enforced before doors close.',
      'Cars must fulfill requests in current direction before reversing (unless idle).'
    ],
    useCases: [
      'UC-1: Passenger on Floor 12 presses UP -> Dispatcher assigns Elevator #3 -> Car arrives and chimes -> Door opens.',
      'UC-2: Passenger inside Car #3 presses Floor 28 -> Car schedules floor into pending queue -> Moves upward.'
    ],
    evaluationCriteria: [
      'Clean separation between Dispatcher (coordination) and ElevatorCar (physical execution).',
      'Use of State Pattern for car states and door states.',
      'Strategy Pattern for elevator dispatch scheduling algorithm.',
      'Observer Pattern for floor arrival sensor notifications.'
    ],
    starterTemplate: {
      classes: [
        {
          id: 'ce1',
          name: 'ElevatorController',
          responsibility: 'Receives floor requests and coordinates dispatching across car bank',
          attributes: [{ name: 'numberOfFloors', type: 'number', visibility: 'private' }],
          methods: [{ name: 'handleHallCall', returnType: 'void', parameters: 'floor: number, direction: Direction', visibility: 'public' }]
        },
        {
          id: 'ce2',
          name: 'ElevatorCar',
          responsibility: 'Models a single elevator car with position, state, and door controls',
          attributes: [
            { name: 'id', type: 'string', visibility: 'private' },
            { name: 'currentFloor', type: 'number', visibility: 'private' }
          ],
          methods: [
            { name: 'moveToFloor', returnType: 'void', parameters: 'floor: number', visibility: 'public' },
            { name: 'openDoor', returnType: 'void', parameters: '', visibility: 'public' }
          ]
        }
      ],
      interfaces: [],
      relationships: [
        {
          id: 're1',
          source: 'ElevatorController',
          target: 'ElevatorCar',
          type: 'AGGREGATION',
          cardinality: '1..*'
        }
      ],
      assumptions: ['Bank of multiple cars with shared dispatch controller.'],
      tradeoffs: 'Decoupling dispatch algorithm from physical car actuators.',
      extensibilityExplanation: 'Can introduce zone-based express dispatching by supplying an IDispatchStrategy implementation.'
    },
    domainRubric: {
      coreConcepts: ['ElevatorCar', 'ElevatorController', 'DispatchStrategy', 'Request', 'Door', 'Direction', 'State'],
      acceptablePatterns: ['State Pattern', 'Strategy Pattern', 'Observer Pattern', 'Command Pattern'],
      antiPatterns: ['Single giant Elevator class with 20 flags', 'Tight coupling between external buttons and concrete motors'],
      expectedScenarios: ['Hall call dispatch', 'Car movement to target floor', 'Door obstruction safety']
    }
  },
  {
    id: 'prob-vending-machine',
    slug: 'smart-vending-machine',
    title: 'State-Driven Smart Vending Machine',
    difficulty: 'EASY',
    estimatedMinutes: 35,
    scenario:
      'Design an object-oriented software system for an automated smart vending machine. The machine supports item selection via code, accepts multiple payment methods (Cash, Card, NFC Contactless), maintains accurate product inventory across discrete racks, computes accurate change, and safely dispenses purchased items while handling edge cases such as sold-out products and transaction cancellation.',
    functionalRequirements: [
      {
        id: 'fr-v1',
        code: 'FR-1',
        title: 'Product Selection & Inventory Tracking',
        description: 'Browse available products, verify slot inventory and price, and alert the customer if an item is sold out.',
        weight: 25,
        keyConcepts: ['product', 'item', 'inventory', 'rack', 'slot', 'soldout', 'stock']
      },
      {
        id: 'fr-v2',
        code: 'FR-2',
        title: 'Payment Acceptance & Balance Management',
        description: 'Accept cash coins/notes or digital payment, accumulate inserted balance, and validate sufficient funds against product price.',
        weight: 25,
        keyConcepts: ['payment', 'coin', 'cash', 'card', 'balance', 'insert', 'currency']
      },
      {
        id: 'fr-v3',
        code: 'FR-3',
        title: 'Dispensing & Inventory Decrement',
        description: 'Dispense the selected product securely upon full payment, decrement inventory count, and update transaction records.',
        weight: 25,
        keyConcepts: ['dispense', 'release', 'deduct', 'decrement', 'deliver']
      },
      {
        id: 'fr-v4',
        code: 'FR-4',
        title: 'Change Return & Cancellation',
        description: 'Calculate change denomination breakdown when payment exceeds product price; return inserted money if user cancels before dispensing.',
        weight: 25,
        keyConcepts: ['change', 'refund', 'cancel', 'return', 'denomination']
      }
    ],
    nonFunctionalRequirements: [
      'State Pattern: State transitions (Idle, Ready, HasMoney, Dispensing, SoldOut) must be cleanly encapsulated without massive nested switch statements.',
      'Money Safety: An item must never dispense if payment has not settled.',
      'Inventory Consistency: Decrement must be transactional.'
    ],
    constraints: [
      'Each rack has a limited slot capacity.',
      'Change return depends on available coins in the internal cash dispenser.'
    ],
    useCases: [
      'UC-1: User inserts $2.00 -> Selects Soda ($1.50) -> Machine transitions to Dispensing -> Soda drops -> $0.50 change returned.',
      'UC-2: User inserts $1.00 -> Presses Cancel -> Machine returns $1.00 and reverts to Idle.'
    ],
    evaluationCriteria: [
      'Encapsulation of machine states using the State Pattern (e.g., IdleState, HasMoneyState, DispensingState).',
      'Separation between Payment Processing, Inventory Management, and Machine State.',
      'Extensible payment method abstraction (Cash vs Card vs Contactless).'
    ],
    starterTemplate: {
      classes: [
        {
          id: 'cv1',
          name: 'VendingMachine',
          responsibility: 'Coordinates inventory, payment context, and delegates actions to current state',
          attributes: [{ name: 'currentBalance', type: 'number', visibility: 'private' }],
          methods: [
            { name: 'selectProduct', returnType: 'void', parameters: 'code: string', visibility: 'public' },
            { name: 'insertMoney', returnType: 'void', parameters: 'amount: number', visibility: 'public' }
          ]
        },
        {
          id: 'cv2',
          name: 'Inventory',
          responsibility: 'Tracks item quantities, rack locations, and stock levels',
          attributes: [{ name: 'items', type: 'Map<string, number>', visibility: 'private' }],
          methods: [
            { name: 'isAvailable', returnType: 'boolean', parameters: 'code: string', visibility: 'public' },
            { name: 'decrementStock', returnType: 'void', parameters: 'code: string', visibility: 'public' }
          ]
        }
      ],
      interfaces: [],
      relationships: [
        {
          id: 'rv1',
          source: 'VendingMachine',
          target: 'Inventory',
          type: 'COMPOSITION',
          cardinality: '1..1'
        }
      ],
      assumptions: ['Single standalone vending unit with physical slots and payment receptor.'],
      tradeoffs: 'Applying State pattern for reliable hardware state transitions.',
      extensibilityExplanation: 'Can add QR code or mobile app unlock without altering inventory logic.'
    },
    domainRubric: {
      coreConcepts: ['VendingMachine', 'State', 'Product', 'Inventory', 'PaymentProcessor', 'CoinDispenser'],
      acceptablePatterns: ['State Pattern', 'Strategy Pattern', 'Factory Pattern'],
      antiPatterns: ['Huge procedural switch statement on machine state', 'Global variable balance tracking'],
      expectedScenarios: ['Normal purchase with change', 'Cancellation with refund', 'Out of stock error']
    }
  },
  {
    id: 'prob-ride-booking',
    slug: 'ride-booking-service',
    title: 'On-Demand Ride Matching Service',
    difficulty: 'MEDIUM',
    estimatedMinutes: 50,
    scenario:
      'Design the core low-level domain architecture for an on-demand ride-hailing service (similar to Uber/Lyft). The system handles rider ride requests, matches available nearby drivers using flexible matching strategies (e.g., closest driver, highest rated), manages the trip lifecycle through state transitions (Requested, Assigned, Arrived, InProgress, Completed, Cancelled), and calculates dynamic fares based on distance, time, and peak surge factors.',
    functionalRequirements: [
      {
        id: 'fr-r1',
        code: 'FR-1',
        title: 'Driver Location & Availability Tracking',
        description: 'Track real-time driver coordinates and availability status (Offline, Idle/Available, OnTrip).',
        weight: 20,
        keyConcepts: ['driver', 'location', 'coordinates', 'available', 'status', 'online']
      },
      {
        id: 'fr-r2',
        code: 'FR-2',
        title: 'Ride Request & Matching Strategy',
        description: 'Allow riders to request a ride tier (Economy, Premium, XL) and match with an optimal driver using a pluggable matching algorithm.',
        weight: 30,
        keyConcepts: ['match', 'strategy', 'request', 'rider', 'nearest', 'algorithm', 'assign']
      },
      {
        id: 'fr-r3',
        code: 'FR-3',
        title: 'Trip Lifecycle & State Machine',
        description: 'Manage the complete trip progression: REQUESTED -> ASSIGNED -> ARRIVED -> IN_PROGRESS -> COMPLETED or CANCELLED.',
        weight: 25,
        keyConcepts: ['trip', 'ride', 'state', 'lifecycle', 'start', 'end', 'complete', 'cancel']
      },
      {
        id: 'fr-r4',
        code: 'FR-4',
        title: 'Dynamic Fare Calculation & Payment',
        description: 'Compute total trip fare using base rate, distance, duration, and optional surge multiplier, then trigger payment settlement.',
        weight: 25,
        keyConcepts: ['fare', 'pricing', 'surge', 'distance', 'payment', 'calculate', 'invoice']
      }
    ],
    nonFunctionalRequirements: [
      'Extensibility: Must support new vehicle tiers and matching heuristics (e.g. EV preference, batch pooling) without changing Trip lifecycle.',
      'Decoupled Pricing: Surge calculation must be independent of Driver matching logic.',
      'Fault Isolation: Driver rejection of a ride request must not abort the overall trip request.'
    ],
    constraints: [
      'A driver can only be assigned to one active trip at a time.',
      'Cancellations after driver arrival incur a cancellation penalty fee.'
    ],
    useCases: [
      'UC-1: Rider requests Comfort ride -> NearestDriverStrategy assigns Driver Alice -> Alice accepts -> Trip starts -> Trip completes -> Fare $22.40 charged.',
      'UC-2: Rider requests ride -> Nearest driver rejects -> Matcher cascades to second nearest driver.'
    ],
    evaluationCriteria: [
      'Decoupling of MatchingStrategy and PricingStrategy via clean interfaces.',
      'Trip lifecycle governed by State Pattern or clean transition guard methods.',
      'Clear abstraction of Location and Distance computations.'
    ],
    starterTemplate: {
      classes: [
        {
          id: 'cr1',
          name: 'RideManager',
          responsibility: 'Coordinates ride requests, driver dispatching, and trip lifecycles',
          attributes: [{ name: 'activeTrips', type: 'Map<string, Trip>', visibility: 'private' }],
          methods: [{ name: 'requestRide', returnType: 'Trip', parameters: 'rider: Rider, pickup: Location, dropoff: Location', visibility: 'public' }]
        },
        {
          id: 'cr2',
          name: 'Trip',
          responsibility: 'Encapsulates a single trip entity, its participants, coordinates, and state',
          attributes: [
            { name: 'tripId', type: 'string', visibility: 'private' },
            { name: 'fare', type: 'number', visibility: 'private' }
          ],
          methods: [
            { name: 'startTrip', returnType: 'void', parameters: '', visibility: 'public' },
            { name: 'completeTrip', returnType: 'void', parameters: '', visibility: 'public' }
          ]
        }
      ],
      interfaces: [],
      relationships: [
        {
          id: 'rr1',
          source: 'RideManager',
          target: 'Trip',
          type: 'COMPOSITION',
          cardinality: '1..*'
        }
      ],
      assumptions: ['Metropolitan area covered by GPS coordinate grid.'],
      tradeoffs: 'Focusing on matching and lifecycle over real-time telematics websocket streams.',
      extensibilityExplanation: 'Can introduce Carpool/Pool rides by plugging in a BatchMatchingStrategy.'
    },
    domainRubric: {
      coreConcepts: ['Rider', 'Driver', 'Trip', 'MatchingStrategy', 'PricingStrategy', 'Location', 'Payment'],
      acceptablePatterns: ['Strategy Pattern', 'State Pattern', 'Observer Pattern', 'Factory Pattern'],
      antiPatterns: ['Single God RideManager computing distance, pricing, and holding DB connections', 'Driver tightly coupled to Rider'],
      expectedScenarios: ['Ride matching', 'Trip start to completion', 'Cancellation with fee']
    }
  }
];
