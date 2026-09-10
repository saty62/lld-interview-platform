import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { ProblemLibrary } from './components/ProblemLibrary.js';
import { ProblemDetail } from './components/ProblemDetail.js';
import { DesignWorkspace } from './components/DesignWorkspace.js';
import { EvaluationFeedback } from './components/EvaluationFeedback.js';
import { AttemptHistory } from './components/AttemptHistory.js';
import { AttemptComparison } from './components/AttemptComparison.js';
import { RecentAttempts } from './components/RecentAttempts.js';
import { EvaluationPhilosophy } from './components/EvaluationPhilosophy.js';
import { api } from './api/client.js';
import { Attempt, Problem } from '../shared/types.js';

type ViewMode =
  | 'library'
  | 'detail'
  | 'workspace'
  | 'feedback'
  | 'history'
  | 'compare'
  | 'recent'
  | 'methodology';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('library');
  const [selectedSlug, setSelectedSlug] = useState<string>('parking-lot-system');
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [compareIds, setCompareIds] = useState<{ baseId: string; targetId: string } | null>(null);

  // Sync active attempt when activeAttemptId changes
  useEffect(() => {
    if (activeAttemptId) {
      api.getAttempt(activeAttemptId)
        .then((att) => {
          setActiveAttempt(att);
          return api.getProblem(att.problemId);
        })
        .then((prob) => setActiveProblem(prob))
        .catch((err) => console.error('Error fetching active attempt:', err));
    }
  }, [activeAttemptId]);

  const handleSelectProblem = (slug: string) => {
    setSelectedSlug(slug);
    setCurrentView('detail');
  };

  const handleStartAttempt = async (slug: string, forkFromAttemptId?: string) => {
    try {
      const newAttempt = await api.createAttempt(slug, forkFromAttemptId);
      setActiveAttemptId(newAttempt.id);
      setActiveAttempt(newAttempt);
      setSelectedSlug(slug);
      setCurrentView('workspace');
    } catch (err: any) {
      alert('Could not start attempt: ' + err.message);
    }
  };

  const handleEvaluated = (evaluatedAttempt: Attempt) => {
    setActiveAttempt(evaluatedAttempt);
    setActiveAttemptId(evaluatedAttempt.id);
    setCurrentView('feedback');
  };

  const handleOpenAttempt = async (attemptId: string) => {
    try {
      const att = await api.getAttempt(attemptId);
      setActiveAttemptId(att.id);
      setActiveAttempt(att);
      const prob = await api.getProblem(att.problemId);
      setActiveProblem(prob);
      setSelectedSlug(prob.slug);

      if (att.status === 'EVALUATED') {
        setCurrentView('feedback');
      } else {
        setCurrentView('workspace');
      }
    } catch (err: any) {
      alert('Failed to open attempt: ' + err.message);
    }
  };

  const handleCompare = (baseId: string, targetId: string) => {
    setCompareIds({ baseId, targetId });
    setCurrentView('compare');
  };

  return (
    <div className="app-container">
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view as ViewMode)}
      />

      <main className="main-content">
        {currentView === 'library' && (
          <ProblemLibrary
            onSelectProblem={handleSelectProblem}
            onStartAttempt={(slug) => handleStartAttempt(slug)}
          />
        )}

        {currentView === 'detail' && (
          <ProblemDetail
            slug={selectedSlug}
            onBack={() => setCurrentView('library')}
            onStartAttempt={(slug) => handleStartAttempt(slug)}
            onViewHistory={(slug) => {
              setSelectedSlug(slug);
              setCurrentView('history');
            }}
          />
        )}

        {currentView === 'workspace' && activeAttemptId && (
          <DesignWorkspace
            attemptId={activeAttemptId}
            onBack={() => setCurrentView('detail')}
            onEvaluated={handleEvaluated}
          />
        )}

        {currentView === 'feedback' && activeAttempt && activeProblem && (
          <EvaluationFeedback
            attempt={activeAttempt}
            problem={activeProblem}
            onRetry={(slug, forkId) => handleStartAttempt(slug, forkId)}
            onViewHistory={(slug) => {
              setSelectedSlug(slug);
              setCurrentView('history');
            }}
            onCompare={handleCompare}
            onBack={() => setCurrentView('detail')}
          />
        )}

        {currentView === 'history' && (
          <AttemptHistory
            slug={selectedSlug}
            onBack={() => setCurrentView('detail')}
            onOpenAttempt={handleOpenAttempt}
            onCompareAttempts={handleCompare}
            onNewAttempt={(slug) => handleStartAttempt(slug)}
          />
        )}

        {currentView === 'compare' && compareIds && (
          <AttemptComparison
            baseId={compareIds.baseId}
            targetId={compareIds.targetId}
            onBack={() => setCurrentView('history')}
          />
        )}

        {currentView === 'recent' && (
          <RecentAttempts
            onOpenAttempt={handleOpenAttempt}
            onBack={() => setCurrentView('library')}
          />
        )}

        {currentView === 'methodology' && (
          <EvaluationPhilosophy onBack={() => setCurrentView('library')} />
        )}
      </main>
    </div>
  );
};
