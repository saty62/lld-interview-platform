import React, { useState, useEffect } from 'react';
import { AttemptComparison as ComparisonType, Attempt } from '../../shared/types.js';
import { api } from '../api/client.js';
import { LiveDiagram } from './LiveDiagram.js';
import {
  GitCompare,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Award,
  Layers
} from 'lucide-react';

interface AttemptComparisonProps {
  baseId: string;
  targetId: string;
  onBack: () => void;
}

export const AttemptComparison: React.FC<AttemptComparisonProps> = ({
  baseId,
  targetId,
  onBack
}) => {
  const [comparison, setComparison] = useState<ComparisonType | null>(null);
  const [baseAttempt, setBaseAttempt] = useState<Attempt | null>(null);
  const [targetAttempt, setTargetAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        setLoading(true);
        const [comp, bAtt, tAtt] = await Promise.all([
          api.compareAttempts(baseId, targetId),
          api.getAttempt(baseId),
          api.getAttempt(targetId)
        ]);
        setComparison(comp);
        setBaseAttempt(bAtt);
        setTargetAttempt(tAtt);
      } catch (err: any) {
        setError(err.message || 'Failed to compute comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [baseId, targetId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
        <p>Computing architectural diff and metric improvements...</p>
      </div>
    );
  }

  if (error || !comparison || !baseAttempt || !targetAttempt) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>Comparison Unavailable</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to compare attempts'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>
    );
  }

  const baseDesign = baseAttempt.submittedSnapshot ? baseAttempt.submittedSnapshot.design : baseAttempt.draftDesign;
  const targetDesign = targetAttempt.submittedSnapshot ? targetAttempt.submittedSnapshot.design : targetAttempt.draftDesign;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} />
          <span>Back to Attempts</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-status badge-evaluated">
            Comparing Attempt #{comparison.baseAttemptNumber} → Attempt #{comparison.targetAttemptNumber}
          </span>
        </div>
      </div>

      {/* Hero Summary Card */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <GitCompare size={22} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            Architectural Progression Analysis
          </h1>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {comparison.summary}
        </p>

        {/* Delta Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Score Delta */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Score Change
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              {comparison.scoreDiff >= 0 ? (
                <TrendingUp size={20} color="var(--accent-emerald)" />
              ) : (
                <TrendingDown size={20} color="var(--accent-rose)" />
              )}
              <span
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: comparison.scoreDiff >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                }}
              >
                {comparison.scoreDiff >= 0 ? `+${comparison.scoreDiff}` : comparison.scoreDiff} pts
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {baseAttempt.evaluation?.overallScore || 0} → {targetAttempt.evaluation?.overallScore || 0} / 100
            </span>
          </div>

          {/* Classes Delta */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Class Count Delta
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                {comparison.metricsDiff.classesDiff >= 0 ? `+${comparison.metricsDiff.classesDiff}` : comparison.metricsDiff.classesDiff}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {baseDesign.classes.length} → {targetDesign.classes.length} classes
            </span>
          </div>

          {/* Coupling Delta */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Relationship Couplings
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {comparison.metricsDiff.couplingDiff >= 0 ? `+${comparison.metricsDiff.couplingDiff}` : comparison.metricsDiff.couplingDiff}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {baseDesign.relationships.length} → {targetDesign.relationships.length} edges
            </span>
          </div>

          {/* Interfaces Delta */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Interface Contracts
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {targetDesign.interfaces.length - baseDesign.interfaces.length >= 0
                  ? `+${targetDesign.interfaces.length - baseDesign.interfaces.length}`
                  : targetDesign.interfaces.length - baseDesign.interfaces.length}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {baseDesign.interfaces.length} → {targetDesign.interfaces.length} interfaces
            </span>
          </div>
        </div>
      </div>

      {/* Improvements & Regressions Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Improvements */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} />
            <span>Advancements Detected ({comparison.improvements.length})</span>
          </h2>
          {comparison.improvements.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No architectural improvements detected.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {comparison.improvements.map((imp, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: '#d1fae5' }}>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>+</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Regressions */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>Regressions or Caveats ({comparison.regressions.length})</span>
          </h2>
          {comparison.regressions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No architectural regressions detected in this revision.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {comparison.regressions.map((reg, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: '#fecdd3' }}>
                  <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>-</span>
                  <span>{reg}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Side-by-Side Live Diagram Diff */}
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>
        Visual UML Architecture Diff
      </h2>

      <div className="diff-container">
        {/* Base Diagram */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Attempt #{comparison.baseAttemptNumber} (Base)
            </span>
            <span className="badge badge-status badge-draft">
              Score: {baseAttempt.evaluation?.overallScore || '-'}/100
            </span>
          </div>
          <div style={{ minHeight: '350px' }}>
            <LiveDiagram design={baseDesign} />
          </div>
        </div>

        {/* Target Diagram */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
              Attempt #{comparison.targetAttemptNumber} (Revised)
            </span>
            <span className="badge badge-status badge-evaluated">
              Score: {targetAttempt.evaluation?.overallScore || '-'}/100
            </span>
          </div>
          <div style={{ minHeight: '350px' }}>
            <LiveDiagram design={targetDesign} />
          </div>
        </div>
      </div>
    </div>
  );
};
