import React, { useState, useEffect } from 'react';
import { AttemptSummary, Problem } from '../../shared/types.js';
import { api } from '../api/client.js';
import {
  History,
  ArrowLeft,
  Calendar,
  Layers,
  Award,
  ArrowRight,
  GitCompare,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AttemptHistoryProps {
  slug: string;
  onBack: () => void;
  onOpenAttempt: (attemptId: string) => void;
  onCompareAttempts: (baseId: string, targetId: string) => void;
  onNewAttempt: (slug: string) => void;
}

export const AttemptHistory: React.FC<AttemptHistoryProps> = ({
  slug,
  onBack,
  onOpenAttempt,
  onCompareAttempts,
  onNewAttempt
}) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prob, atts] = await Promise.all([
          api.getProblem(slug),
          api.getProblemAttempts(slug)
        ]);
        setProblem(prob);
        setAttempts(atts);
      } catch (err: any) {
        setError(err.message || 'Failed to load attempt history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
        <p>Loading attempt progression history...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} />
          <span>Back to Problem</span>
        </button>

        <button className="btn btn-primary btn-sm" onClick={() => onNewAttempt(slug)}>
          <span>Start New Attempt</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <History size={20} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {problem?.title || 'Problem'} — Attempt History
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Track your architectural evolution across repeated attempts. Compare designs to inspect how coupling decreased and responsibilities sharpened.
        </p>
      </div>

      {/* Compare Any Two Attempts Selector */}
      {attempts.length >= 2 && (
        <div
          className="glass-card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'rgba(99, 102, 241, 0.08)',
            borderColor: 'rgba(99, 102, 241, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <GitCompare size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
              Compare Any Two Attempts:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Base:</span>
              <select
                className="form-select"
                style={{ width: '130px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                value={compareBaseId || attempts[attempts.length - 1]?.id}
                onChange={(e) => setCompareBaseId(e.target.value)}
              >
                {attempts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Attempt #{a.attemptNumber} ({a.overallScore !== undefined ? `${Math.round(a.overallScore)}pts` : a.status})
                  </option>
                ))}
              </select>
            </div>

            <span style={{ color: 'var(--text-muted)' }}>→</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target:</span>
              <select
                className="form-select"
                style={{ width: '130px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                value={compareTargetId || attempts[0]?.id}
                onChange={(e) => setCompareTargetId(e.target.value)}
              >
                {attempts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Attempt #{a.attemptNumber} ({a.overallScore !== undefined ? `${Math.round(a.overallScore)}pts` : a.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const bId = compareBaseId || attempts[attempts.length - 1]?.id;
                const tId = compareTargetId || attempts[0]?.id;
                if (bId === tId) {
                  alert('Please select two distinct attempts to compare.');
                  return;
                }
                onCompareAttempts(bId, tId);
              }}
            >
              <span>Compare Progression</span>
            </button>
          </div>
        </div>
      )}

      {/* Attempts List */}
      {attempts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            No attempts recorded yet for this problem.
          </p>
          <button className="btn btn-primary" onClick={() => onNewAttempt(slug)}>
            Start First Attempt
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {attempts.map((att, idx) => {
            const prevAttempt = idx < attempts.length - 1 ? attempts[idx + 1] : null;

            return (
              <div
                key={att.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {/* Score Circle / Badge */}
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: att.overallScore !== undefined ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                      border: `2px solid ${att.overallScore !== undefined ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#fff',
                      fontSize: '1rem'
                    }}
                  >
                    {att.overallScore !== undefined ? Math.round(att.overallScore) : '-'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
                        Attempt #{att.attemptNumber}
                      </span>
                      <span className={`badge badge-status ${att.status === 'EVALUATED' ? 'badge-evaluated' : 'badge-draft'}`}>
                        {att.status}
                      </span>
                      {att.qualitativeLevel && (
                        <span className="badge badge-status badge-easy">
                          {att.qualitativeLevel.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} />
                        {new Date(att.updatedAt).toLocaleDateString()} at{' '}
                        {new Date(att.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span>{att.classCount} Classes</span>
                      <span>•</span>
                      <span>{att.interfaceCount} Interfaces</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {prevAttempt && att.status === 'EVALUATED' && prevAttempt.status === 'EVALUATED' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onCompareAttempts(prevAttempt.id, att.id)}
                      title="Compare metrics against previous attempt"
                    >
                      <GitCompare size={14} />
                      <span>Compare with #{prevAttempt.attemptNumber}</span>
                    </button>
                  )}

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onOpenAttempt(att.id)}
                  >
                    <span>{att.status === 'EVALUATED' ? 'View Evaluation' : 'Resume Draft'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
