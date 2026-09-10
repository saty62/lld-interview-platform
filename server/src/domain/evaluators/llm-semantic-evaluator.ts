import { SemanticEvaluator } from './semantic-evaluator.interface.js';
import { MockSemanticEvaluator } from './mock-semantic-evaluator.js';
import { EvaluationContext } from '../evaluation-rule.interface.js';
import { RuleEvaluationResult, SemanticFeedbackReport } from '../../../shared/types.js';

export class LLMSemanticEvaluator implements SemanticEvaluator {
  readonly name = 'AI-Assisted Qualitative Evaluator';
  readonly type = 'HYBRID_LLM' as const;
  private fallbackEvaluator: MockSemanticEvaluator;

  constructor() {
    this.fallbackEvaluator = new MockSemanticEvaluator();
  }

  async evaluate(context: EvaluationContext, ruleResults: RuleEvaluationResult[]): Promise<SemanticFeedbackReport> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      // Offline mode fallback
      return this.fallbackEvaluator.evaluate(context, ruleResults);
    }

    try {
      const prompt = this.buildPrompt(context, ruleResults);

      if (geminiKey) {
        return await this.callGemini(geminiKey, prompt, context, ruleResults);
      } else if (openaiKey) {
        return await this.callOpenAI(openaiKey, prompt, context, ruleResults);
      }

      return this.fallbackEvaluator.evaluate(context, ruleResults);
    } catch (err) {
      console.warn('[LLMSemanticEvaluator] External LLM call failed or timed out. Falling back to heuristic evaluator:', err);
      return this.fallbackEvaluator.evaluate(context, ruleResults);
    }
  }

  private buildPrompt(context: EvaluationContext, ruleResults: RuleEvaluationResult[]): string {
    const { problem, design } = context;

    return `You are a Principal Software Engineer evaluating a candidate's Low-Level Design (LLD) submission.

PROBLEM STATEMENT:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Scenario: ${problem.scenario}
Functional Requirements:
${problem.functionalRequirements.map((r) => `- [${r.code}] ${r.title}: ${r.description}`).join('\n')}

CANDIDATE'S DESIGN SCHEMA:
Classes:
${JSON.stringify(design.classes, null, 2)}

Interfaces:
${JSON.stringify(design.interfaces, null, 2)}

Relationships:
${JSON.stringify(design.relationships, null, 2)}

Assumptions: ${JSON.stringify(design.assumptions)}
Trade-offs: ${design.tradeoffs || '(None)'}
Extensibility: ${design.extensibilityExplanation || '(None)'}
Patterns Applied: ${JSON.stringify(design.patternsApplied)}

DETERMINISTIC RULE FINDINGS:
${ruleResults.map((r) => `- ${r.ruleName} (${r.category}): Score ${r.score}/${r.maxScore}. Passed: ${r.passed}`).join('\n')}

INSTRUCTIONS:
Evaluate this design. Do NOT penalize alternative valid architectures (e.g. State pattern vs Strategy pattern).
Respond ONLY with a valid JSON object matching this schema:
{
  "qualitativeSummary": "Short 2-3 sentence overview of the design quality and principal trade-offs",
  "strengths": ["Array of 2-4 specific structural strengths citing candidate classes/interfaces"],
  "areasForImprovement": ["Array of 2-4 actionable remediation points with specific suggestions"],
  "tradeoffCritique": "Evaluation of candidate's trade-off rationale",
  "alternativeDesigns": ["1-2 alternative valid architectural approaches for this problem"],
  "patternAnalysis": "Analysis of design patterns used or missed",
  "extensibilityVerdict": "Verdict on how easily new requirements can be added",
  "semanticScore": 85 (A number from 0 to 100 representing qualitative LLD design excellence)
}`;
  }

  private async callGemini(
    apiKey: string,
    prompt: string,
    context: EvaluationContext,
    ruleResults: RuleEvaluationResult[]
  ): Promise<SemanticFeedbackReport> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');

      const parsed = JSON.parse(rawText);
      return this.validateAndNormalize(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callOpenAI(
    apiKey: string,
    prompt: string,
    context: EvaluationContext,
    ruleResults: RuleEvaluationResult[]
  ): Promise<SemanticFeedbackReport> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API returned status ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(rawText);
      return this.validateAndNormalize(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateAndNormalize(data: any): SemanticFeedbackReport {
    return {
      qualitativeSummary: typeof data.qualitativeSummary === 'string' ? data.qualitativeSummary : 'Evaluation completed.',
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      areasForImprovement: Array.isArray(data.areasForImprovement) ? data.areasForImprovement : [],
      tradeoffCritique: typeof data.tradeoffCritique === 'string' ? data.tradeoffCritique : '',
      alternativeDesigns: Array.isArray(data.alternativeDesigns) ? data.alternativeDesigns : [],
      patternAnalysis: typeof data.patternAnalysis === 'string' ? data.patternAnalysis : '',
      extensibilityVerdict: typeof data.extensibilityVerdict === 'string' ? data.extensibilityVerdict : '',
      semanticScore: typeof data.semanticScore === 'number' ? Math.min(100, Math.max(0, data.semanticScore)) : 75
    };
  }
}
