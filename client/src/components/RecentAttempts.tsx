import React, { useEffect, useState } from 'react';
import { AttemptSummary } from '../../shared/types.js';
import { api } from '../api/client.js';
import { Clock, ArrowRight, Layers, ArrowLeft } from 'lucide-react';

interface RecentAttemptsProps {
  onOpenAttempt: (attemptId: string) => void;
  onBack: () => void;
}

export const RecentAttempts: React.FC<RecentAttemptsProps> = ({ onOpenAttempt, onBack }) => {
  const [recents, setRecents] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecentAttempts()
      .then(setRecents)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={15} />
        <span>Back to Library</span>
      </button>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Clock size={20} color="var(--accent-cyan)" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Recent Design Attempts</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Overview of all ongoing drafts and evaluated architectures across challenges.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>Loading recent activity...</p>
        </div>
      ) : recents.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No design attempts created yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recents.map((att) => (
            <div
              key={att.id}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                    {att.problemTitle}
                  </span>
                  <span className="badge badge-status badge-draft">
                    Attempt #{att.attemptNumber}
                  </span>
                  <span className={`badge badge-status ${att.status === 'EVALUATED' ? 'badge-evaluated' : 'badge-draft'}`}>
                    {att.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Updated {new Date(att.updatedAt).toLocaleDateString()} • {att.classCount} classes, {att.interfaceCount} interfaces
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {att.overallScore !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {Math.round(att.overallScore)}/100
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Score</div>
                  </div>
                )}

                <button className="btn btn-primary btn-sm" onClick={() => onOpenAttempt(att.id)}>
                  <span>Open</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
