import {
  Problem,
  Attempt,
  AttemptSummary,
  AttemptComparison,
  Design
} from '../../shared/types.js';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  getProblems: () => request<Problem[]>('/problems'),
  getProblem: (slug: string) => request<Problem>(`/problems/${slug}`),
  createAttempt: (slug: string, forkFromAttemptId?: string) =>
    request<Attempt>(`/problems/${slug}/attempts`, {
      method: 'POST',
      body: JSON.stringify({ forkFromAttemptId })
    }),
  getAttempt: (id: string) => request<Attempt>(`/attempts/${id}`),
  saveDraft: (id: string, design: Design) =>
    request<Attempt>(`/attempts/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ design })
    }),
  submitAttempt: (id: string) =>
    request<Attempt>(`/attempts/${id}/submit`, {
      method: 'POST'
    }),
  retryEvaluation: (id: string) =>
    request<Attempt>(`/attempts/${id}/retry`, {
      method: 'POST'
    }),
  getProblemAttempts: (slug: string) =>
    request<AttemptSummary[]>(`/problems/${slug}/attempts`),
  getRecentAttempts: () => request<AttemptSummary[]>('/attempts/recent'),
  compareAttempts: (baseId: string, targetId: string) =>
    request<AttemptComparison>(`/attempts/compare?baseId=${baseId}&targetId=${targetId}`)
};
