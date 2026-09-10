import { EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, SemanticFeedbackReport } from '../../../shared/types.js';

export interface SemanticEvaluator {
  readonly name: string;
  readonly type: 'HYBRID_LLM' | 'HYBRID_MOCK';
  evaluate(context: EvaluationContext, ruleResults: RuleEvaluationResult[]): Promise<SemanticFeedbackReport>;
}
