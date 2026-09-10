import React, { useState, useEffect } from 'react';
import { Problem, AttemptSummary } from '../../shared/types.js';
import { api } from '../api/client.js';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  History,
  CheckSquare,
  Award,
  Layers
} from 'lucide-react';

interface ProblemDetailProps {
  slug: string;
  onBack: () => void;
  onStartAttempt: (slug: string) => void;
  onViewHistory: (slug: string) => void;
}

export const ProblemDetail: React.FC<ProblemDetailProps> = ({
  slug,
  onBack,
  onStartAttempt,
  onViewHistory
}) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [history, setHistory] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [prob, hist] = await Promise.all([
          api.getProblem(slug),
          api.getProblemAttempts(slug).catch(() => [])
        ]);
        setProblem(prob);
        setHistory(hist);
      } catch (err: any) {
        setError(err.message || 'Failed to load problem details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
        <p>Loading problem specification...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>Problem Not Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unknown error'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Library</span>
        </button>
      </div>
    );
  }

  const diffClass =
    problem.difficulty === 'EASY'
      ? 'badge-easy'
      : problem.difficulty === 'MEDIUM'
      ? 'badge-medium'
      : 'badge-hard';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Navigation & Header */}
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={15} />
        <span>Back to Problem Library</span>
      </button>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span className={`badge ${diffClass}`}>{problem.difficulty}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Clock size={15} />
            <span>Recommended Time: {problem.estimatedMinutes} mins</span>
          </div>
          {history.length > 0 && (
            <span className="badge badge-status badge-evaluated">
              {history.length} Attempt{history.length > 1 ? 's' : ''} Completed
            </span>
          )}
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          {problem.title}
        </h1>

        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
          {problem.scenario}
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onStartAttempt(problem.slug)} style={{ padding: '0.75rem 1.75rem' }}>
            <Play size={18} fill="#fff" />
            <span>{history.length > 0 ? 'Start New Attempt' : 'Start Designing Now'}</span>
          </button>

          {history.length > 0 && (
            <button className="btn btn-secondary" onClick={() => onViewHistory(problem.slug)}>
              <History size={17} />
              <span>Review Past Attempts ({history.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Functional Requirements */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckSquare size={20} color="var(--accent-primary)" />
          <span>Functional Requirements</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {problem.functionalRequirements.map((req) => (
            <div
              key={req.id}
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                  <span style={{ color: 'var(--accent-cyan)', marginRight: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    {req.code}
                  </span>
                  {req.title}
                </span>
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                  Weight: {req.weight}%
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                {req.description}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {req.keyConcepts.map((concept) => (
                  <span key={concept} className="method-tag" style={{ fontSize: '0.7rem' }}>
                    #{concept}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Functional Requirements & Constraints Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--accent-emerald)" />
            <span>Architecture Guidelines</span>
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {problem.nonFunctionalRequirements.map((nfr, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <span>{nfr}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="var(--accent-amber)" />
            <span>Constraints & Edge Cases</span>
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {problem.constraints.map((c, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <AlertTriangle size={16} color="var(--accent-amber)" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Use Cases & Evaluation Criteria */}
      <div className="glass-card" style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} color="var(--accent-cyan)" />
          <span>Evaluation Rubric Highlights</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Your solution will be evaluated on coupling, cohesion, interface segregation, requirements coverage, and trade-off justification.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {problem.evaluationCriteria.map((crit, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                color: '#cbd5e1'
              }}
            >
              • {crit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
