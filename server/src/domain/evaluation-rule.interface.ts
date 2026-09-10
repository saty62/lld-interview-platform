import { Problem, Design, RuleEvaluationResult } from '../../shared/types.js';

export interface EvaluationContext {
  problem: Problem;
  design: Design;
}

export interface EvaluationRule {
  readonly id: string;
  readonly name: string;
  readonly category: RuleEvaluationResult['category'];
  readonly maxScore: number;
  evaluate(context: EvaluationContext): Promise<RuleEvaluationResult>;
}
