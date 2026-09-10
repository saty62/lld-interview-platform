import React, { useState, useEffect } from 'react';
import { Problem, AttemptSummary, Difficulty } from '../../shared/types.js';
import { api } from '../api/client.js';
import { BookOpen, Clock, ArrowRight, CheckCircle, Search, Filter, ShieldCheck } from 'lucide-react';

interface ProblemLibraryProps {
  onSelectProblem: (slug: string) => void;
  onStartAttempt: (slug: string) => void;
}

export const ProblemLibrary: React.FC<ProblemLibraryProps> = ({ onSelectProblem, onStartAttempt }) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [probs, recents] = await Promise.all([
          api.getProblems(),
          api.getRecentAttempts().catch(() => [])
        ]);
        setProblems(probs);
        setRecentAttempts(recents);
      } catch (err: any) {
        setError(err.message || 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProblems = problems.filter((p) => {
    const matchesDiff = selectedDifficulty === 'ALL' || p.difficulty === selectedDifficulty;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scenario.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiff && matchesSearch;
  });

  const getBestScore = (problemId: string): { score?: number; attemptsCount: number } => {
    const problemAttempts = recentAttempts.filter((a) => a.problemId === problemId);
    if (problemAttempts.length === 0) return { attemptsCount: 0 };
    const scores = problemAttempts
      .map((a) => a.overallScore)
      .filter((s): s is number => typeof s === 'number');
    const maxScore = scores.length > 0 ? Math.max(...scores) : undefined;
    return { score: maxScore, attemptsCount: problemAttempts.length };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Loading Challenge Bank...
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Retrieving real-world LLD problems and attempt histories
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>Failed to Load Problems</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Banner */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-status badge-evaluated">
            <ShieldCheck size={12} /> Hybrid Deterministic & Semantic Evaluation
          </span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          Master Object-Oriented & Low-Level Design
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: 1.6 }}>
          Practice designing clean, extensible architectures with instant multi-dimensional feedback.
          Evaluate coupling, cohesion, SOLID principles, and trade-offs across repeated attempts.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search problems, domains, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '0.25rem 0' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>DIFFICULTY:</span>
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`btn btn-sm ${selectedDifficulty === diff ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Grid */}
      <div className="problem-grid">
        {filteredProblems.map((prob) => {
          const { score, attemptsCount } = getBestScore(prob.id);
          const diffClass =
            prob.difficulty === 'EASY'
              ? 'badge-easy'
              : prob.difficulty === 'MEDIUM'
              ? 'badge-medium'
              : 'badge-hard';

          return (
            <div key={prob.id} className="glass-card problem-card">
              <div>
                <div className="problem-header">
                  <span className={`badge ${diffClass}`}>{prob.difficulty}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Clock size={14} />
                    <span>~{prob.estimatedMinutes} mins</span>
                  </div>
                </div>

                <h2 className="problem-title">{prob.title}</h2>
                <p className="problem-scenario">{prob.scenario}</p>

                <div className="problem-meta">
                  <span>{prob.functionalRequirements.length} Requirements</span>
                  <span>•</span>
                  <span>{prob.useCases.length} Use Cases</span>
                  {attemptsCount > 0 && (
                    <>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={13} />
                        {score !== undefined ? `Best Score: ${score}/100` : `${attemptsCount} Attempts`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => onSelectProblem(prob.slug)}
                >
                  <BookOpen size={15} />
                  <span>Inspect Spec</span>
                </button>

                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => onStartAttempt(prob.slug)}
                >
                  <span>{attemptsCount > 0 ? 'New Attempt' : 'Start Design'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
