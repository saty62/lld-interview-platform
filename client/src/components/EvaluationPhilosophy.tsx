import React from 'react';
import { ArrowLeft, Compass, ShieldCheck, Cpu, GitFork, Award } from 'lucide-react';

interface EvaluationPhilosophyProps {
  onBack: () => void;
}

export const EvaluationPhilosophy: React.FC<EvaluationPhilosophyProps> = ({ onBack }) => {
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '4rem' }}>
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={15} />
        <span>Back to Problem Library</span>
      </button>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Compass size={22} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            Evaluation Philosophy & Architectural Rubric
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          "What makes feedback useful when there can be more than one valid LLD solution?"
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitFork size={18} />
            <span>1. Beyond the "Single Canonical Solution" Myth</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.7 }}>
            In Low-Level and Object-Oriented Design, there is rarely a single "correct" class hierarchy. For example, in an Elevator System, dispatching can legitimately be modeled using the <strong>Strategy Pattern</strong> (SCAN/LOOK algorithm), the <strong>State Pattern</strong> (managing door/movement state transitions), or a table-driven dispatch queue. 
            LLD Arena <strong>never enforces arbitrary class names</strong>. Instead, it measures whether requirements are accounted for, responsibilities are single-purpose, and coupling is controlled.
          </p>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} />
            <span>2. The Hybrid Evaluation Architecture</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.7, marginBottom: '1rem' }}>
            We combine objective graph analytics with qualitative architectural critique:
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
            <li style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>•</span>
              <span><strong>Deterministic Graph Linter (50% Weight):</strong> Computes Fan-in, Fan-out, detects bidirectional coupling, flags God Classes (&gt;7 methods), checks for acyclic inheritance, and maps functional requirements.</span>
            </li>
            <li style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>•</span>
              <span><strong>Semantic Reasoning Evaluator (50% Weight):</strong> Audits abstraction quality, checks design pattern fit, and critiques your stated trade-offs. Operates 100% locally in offline mode with graceful heuristic fallbacks.</span>
            </li>
          </ul>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} />
            <span>3. Actionable, Explainable Findings</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.7 }}>
            A generic complaint like "coupling is high" is unhelpful. LLD Arena generates pinpoint diagnostic cards identifying the exact classes involved, why the coupling creates fragility, and concrete refactoring suggestions (e.g. "OrderService directly creates PaymentProcessor. Consider introducing IPaymentService to satisfy Dependency Inversion").
          </p>
        </div>
      </div>
    </div>
  );
};
