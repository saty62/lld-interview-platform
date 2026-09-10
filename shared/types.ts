export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Requirement {
  id: string;
  code: string;
  title: string;
  description: string;
  weight: number;
  keyConcepts: string[];
}

export type RelationType = 'INHERITANCE' | 'IMPLEMENTATION' | 'COMPOSITION' | 'AGGREGATION' | 'DEPENDENCY';

export interface MethodDefinition {
  name: string;
  returnType: string;
  parameters: string;
  visibility?: 'public' | 'protected' | 'private';
}

export interface AttributeDefinition {
  name: string;
  type: string;
  visibility?: 'public' | 'protected' | 'private';
}

export interface ClassDefinition {
  id: string;
  name: string;
  isAbstract?: boolean;
  responsibility: string;
  attributes: AttributeDefinition[];
  methods: MethodDefinition[];
}

export interface InterfaceDefinition {
  id: string;
  name: string;
  responsibility: string;
  methods: MethodDefinition[];
}

export interface RelationshipDefinition {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  cardinality?: string;
  description?: string;
}

export interface PatternUsage {
  pattern: string;
  appliedTo: string[];
  justification: string;
}

export interface Design {
  classes: ClassDefinition[];
  interfaces: InterfaceDefinition[];
  relationships: RelationshipDefinition[];
  patternsApplied: PatternUsage[];
  assumptions: string[];
  tradeoffs: string;
  extensibilityExplanation: string;
}

export interface DesignTemplate {
  classes: ClassDefinition[];
  interfaces: InterfaceDefinition[];
  relationships: RelationshipDefinition[];
  assumptions?: string[];
  tradeoffs?: string;
  extensibilityExplanation?: string;
}

export interface DomainRubric {
  coreConcepts: string[];
  acceptablePatterns: string[];
  antiPatterns: string[];
  expectedScenarios: string[];
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  scenario: string;
  functionalRequirements: Requirement[];
  nonFunctionalRequirements: string[];
  constraints: string[];
  useCases: string[];
  evaluationCriteria: string[];
  starterTemplate: DesignTemplate;
  domainRubric: DomainRubric;
  createdAt?: string;
}

export type AttemptStatus = 'DRAFT' | 'SUBMITTED' | 'EVALUATING' | 'EVALUATED' | 'EVALUATION_FAILED';

export interface SubmissionSnapshot {
  submissionId: string;
  submittedAt: string;
  design: Design;
}

export type FeedbackSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type FeedbackCategory =
  | 'REQUIREMENTS_COVERAGE'
  | 'RESPONSIBILITY_ALLOCATION'
  | 'COUPLING_COHESION'
  | 'EXTENSIBILITY'
  | 'DESIGN_REASONING'
  | 'STRUCTURAL_INTEGRITY';

export interface FeedbackItem {
  id: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  title: string;
  explanation: string;
  evidence: string;
  recommendation: string;
  targetEntity?: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  category: FeedbackCategory;
  score: number;
  maxScore: number;
  passed: boolean;
  metrics: Record<string, number | string>;
  feedback: FeedbackItem[];
}

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  description: string;
}

export type QualitativeLevel = 'EXEMPLARY' | 'PROFICIENT' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT';

export interface SemanticFeedbackReport {
  qualitativeSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  tradeoffCritique: string;
  alternativeDesigns: string[];
  patternAnalysis: string;
  extensibilityVerdict: string;
  semanticScore?: number;
}

export interface Evaluation {
  id: string;
  attemptId: string;
  overallScore: number;
  qualitativeLevel: QualitativeLevel;
  deterministicScore: number;
  semanticScore: number;
  evaluatorType: 'HYBRID_LLM' | 'HYBRID_MOCK' | 'DETERMINISTIC_ONLY';
  scoreDimensions: ScoreDimension[];
  ruleResults: RuleEvaluationResult[];
  feedbackItems: FeedbackItem[];
  strengths: string[];
  areasForImprovement: string[];
  tradeoffCritique: string;
  alternativeDesigns: string[];
  executionDurationMs: number;
  evaluatedAt: string;
}

export interface Attempt {
  id: string;
  problemId: string;
  attemptNumber: number;
  status: AttemptStatus;
  draftDesign: Design;
  submittedSnapshot: SubmissionSnapshot | null;
  evaluation: Evaluation | null;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface AttemptSummary {
  id: string;
  problemId: string;
  problemSlug?: string;
  problemTitle: string;
  attemptNumber: number;
  status: AttemptStatus;
  overallScore?: number;
  qualitativeLevel?: QualitativeLevel;
  submittedAt?: string;
  updatedAt: string;
  classCount: number;
  interfaceCount: number;
}

export interface AttemptComparison {
  baseAttemptId: string;
  targetAttemptId: string;
  baseAttemptNumber: number;
  targetAttemptNumber: number;
  scoreDiff: number;
  metricsDiff: {
    couplingDiff: number;
    classesDiff: number;
    methodsDiff: number;
    requirementsCoverageDiff: number;
  };
  improvements: string[];
  regressions: string[];
  summary: string;
}
