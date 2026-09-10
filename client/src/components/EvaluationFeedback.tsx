import React, { useState } from 'react';
import { Attempt, Problem } from '../../shared/types.js';
import {
  Award,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Sparkles,
  RefreshCw,
  History,
  GitCompare,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Compass
} from 'lucide-react';

interface EvaluationFeedbackProps {
  attempt: Attempt;
  problem: Problem;
  onRetry: (problemSlug: string, forkFromAttemptId: string) => void;
  onViewHistory: (problemSlug: string) => void;
  onCompare: (baseId: string, targetId: string) => void;
  onBack: () => void;
}

export const EvaluationFeedback: React.FC<EvaluationFeedbackProps> = ({
  attempt,
  problem,
  onRetry,
  onViewHistory,
  onCompare,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'alternatives' | 'dimensions'>('diagnostics');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetryFailedEvaluation = async () => {
    try {
      setIsRetrying(true);
      setRetryError(null);
      await api.retryEvaluation(attempt.id);
      window.location.reload();
    } catch (err: any) {
      setIsRetrying(false);
      setRetryError(err.message || 'Retry failed');
    }
  };

  const evaluation = attempt.evaluation;
  if (!evaluation) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--accent-rose)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>
          {attempt.status === 'EVALUATION_FAILED' ? 'Evaluation Execution Failed' : 'No Evaluation Found'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {attempt.failureReason
            ? `Failure diagnostic: ${attempt.failureReason}`
            : 'This submission has not completed evaluation.'}
        </p>

        {retryError && (
          <p style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {retryError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to Problem</span>
          </button>

          {attempt.status === 'EVALUATION_FAILED' && (
            <button
              className="btn btn-primary"
              onClick={handleRetryFailedEvaluation}
              disabled={isRetrying}
            >
              <RefreshCw size={15} />
              <span>{isRetrying ? 'Retrying Pipeline...' : 'Retry Evaluation'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const levelColor =
    evaluation.qualitativeLevel === 'EXEMPLARY'
      ? 'var(--accent-emerald)'
      : evaluation.qualitativeLevel === 'PROFICIENT'
      ? 'var(--accent-cyan)'
      : evaluation.qualitativeLevel === 'DEVELOPING'
      ? 'var(--accent-amber)'
      : 'var(--accent-rose)';

  const filteredItems = evaluation.feedbackItems.filter((item) => {
    if (filterSeverity === 'ALL') return true;
    return item.severity === filterSeverity;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} />
          <span>Back to Problem</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {attempt.attemptNumber > 1 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onViewHistory(problem.slug)}
            >
              <GitCompare size={15} />
              <span>Compare with Attempt #{attempt.attemptNumber - 1}</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onViewHistory(problem.slug)}
          >
            <History size={15} />
            <span>Attempt History</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onRetry(problem.slug, attempt.id)}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            <RefreshCw size={14} />
            <span>Revise & Try Again</span>
          </button>
        </div>
      </div>

      {/* Score Hero */}
      <div className="score-hero">
        <div className="score-circle" style={{ borderColor: levelColor }}>
          <div className="score-value">{Math.round(evaluation.overallScore)}</div>
          <div className="score-total">/ 100</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span
              className="badge"
              style={{
                background: `rgba(${levelColor}, 0.15)`,
                color: levelColor,
                border: `1px solid ${levelColor}`
              }}
            >
              {evaluation.qualitativeLevel.replace('_', ' ')}
            </span>
            <span className="badge badge-status badge-draft">
              Attempt #{attempt.attemptNumber}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Evaluated in {evaluation.executionDurationMs}ms
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Architecture Evaluation Report
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {evaluation.qualitativeLevel === 'EXEMPLARY'
              ? 'Outstanding architectural structure! Clean separation of concerns, well-chosen abstractions, and thorough requirements coverage.'
              : evaluation.qualitativeLevel === 'PROFICIENT'
              ? 'Strong foundational design. Primary functional requirements are addressed with reasonable decoupling. A few areas can be refined for tighter cohesion.'
              : 'Decent initial baseline. Some responsibilities require clearer boundaries, or high coupling was detected between concrete entities.'}
          </p>
        </div>
      </div>

      {/* Score Dimension Breakdown Bars */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} color="var(--accent-primary)" />
          <span>Dimension Breakdown</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {evaluation.scoreDimensions.map((dim) => (
            <div key={dim.key} style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>{dim.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {dim.score}/{dim.maxScore} ({dim.percentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${dim.percentage}%`,
                    background: dim.percentage >= 80 ? 'var(--accent-emerald)' : dim.percentage >= 60 ? 'var(--accent-cyan)' : 'var(--accent-amber)',
                    borderRadius: '3px',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {dim.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Navigation Tabs: Diagnostics, Alternatives, Strengths */}
      <div className="tab-list" style={{ marginBottom: '1.5rem', background: 'transparent', padding: 0 }}>
        <button
          className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          <AlertCircle size={16} />
          <span>Actionable Findings ({evaluation.feedbackItems.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'alternatives' ? 'active' : ''}`}
          onClick={() => setActiveTab('alternatives')}
        >
          <Compass size={16} />
          <span>Alternative Solutions & Trade-offs</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dimensions' ? 'active' : ''}`}
          onClick={() => setActiveTab('dimensions')}
        >
          <Sparkles size={16} />
          <span>Key Strengths ({evaluation.strengths.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIONABLE FINDINGS */}
      {activeTab === 'diagnostics' && (
        <div>
          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEVERITY:</span>
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                className={`btn btn-sm ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setFilterSeverity(sev)}
              >
                {sev}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckCircle size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No Issues in this Category</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Your design satisfies all checks for this severity filter.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const sevClass = item.severity === 'CRITICAL' ? 'critical' : item.severity === 'WARNING' ? 'warning' : 'info';
              return (
                <div key={item.id} className={`diagnostic-card ${sevClass}`}>
                  <div className="diagnostic-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.severity === 'CRITICAL' ? (
                        <AlertCircle size={18} color="var(--accent-rose)" />
                      ) : item.severity === 'WARNING' ? (
                        <AlertTriangle size={18} color="var(--accent-amber)" />
                      ) : (
                        <Info size={18} color="var(--accent-cyan)" />
                      )}
                      <span>{item.title}</span>
                    </div>

                    <span className="badge" style={{ fontSize: '0.65rem' }}>
                      {item.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="diagnostic-explanation">{item.explanation}</p>

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    <strong>Evidence:</strong> {item.evidence}
                  </div>

                  <div className="diagnostic-rec">
                    <strong style={{ color: '#fff', marginRight: '0.4rem' }}>Recommendation:</strong>
                    {item.recommendation}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ALTERNATIVE SOLUTIONS & TRADEOFFS */}
      {activeTab === 'alternatives' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tradeoff Critique */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} color="var(--accent-cyan)" />
              <span>Staff Engineer Critique on Stated Trade-offs</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.7, background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              {evaluation.tradeoffCritique}
            </p>
          </div>

          {/* Alternative Valid Paradigms */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitCompare size={18} color="var(--accent-emerald)" />
              <span>Alternative Valid Architectural Approaches</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              In Low-Level Design, multiple valid solutions exist for the same problem. Here is how senior architects solve this challenge using alternative patterns:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {evaluation.alternativeDesigns.map((alt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    fontSize: '0.9rem',
                    color: '#e2e8f0',
                    lineHeight: 1.6
                  }}
                >
                  {alt}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KEY STRENGTHS */}
      {activeTab === 'dimensions' && (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-emerald)" />
            <span>Design Strengths & Architectural Merits</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {evaluation.strengths.map((str, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  color: '#d1fae5'
                }}
              >
                <CheckCircle size={18} color="var(--accent-emerald)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA Bar */}
      <div
        style={{
          marginTop: '2.5rem',
          padding: '1.5rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Ready to refine your architecture?
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Retrying creates Attempt #{attempt.attemptNumber + 1} prefilled with your current design so you can address the feedback.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => onRetry(problem.slug, attempt.id)}
          style={{ padding: '0.75rem 1.75rem' }}
        >
          <RefreshCw size={16} />
          <span>Revise in Attempt #{attempt.attemptNumber + 1}</span>
        </button>
      </div>
    </div>
  );
};
