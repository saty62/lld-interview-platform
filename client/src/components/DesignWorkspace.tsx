import React, { useState, useEffect, useRef } from 'react';
import {
  Attempt,
  Problem,
  Design,
  ClassDefinition,
  InterfaceDefinition,
  RelationshipDefinition,
  RelationType,
  PatternUsage
} from '../../shared/types.js';
import { api } from '../api/client.js';
import { LiveDiagram } from './LiveDiagram.js';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  CheckSquare,
  Layers,
  Sparkles,
  FileText,
  GitFork,
  HelpCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface DesignWorkspaceProps {
  attemptId: string;
  onBack: () => void;
  onEvaluated: (attempt: Attempt) => void;
}

export const DesignWorkspace: React.FC<DesignWorkspaceProps> = ({
  attemptId,
  onBack,
  onEvaluated
}) => {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [design, setDesign] = useState<Design | null>(null);
  const [activeTab, setActiveTab] = useState<'classes' | 'interfaces' | 'relationships' | 'patterns' | 'notes'>('classes');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const autoSaveTimeout = useRef<any>(null);

  // Load attempt and problem
  useEffect(() => {
    const loadData = async () => {
      try {
        const att = await api.getAttempt(attemptId);
        setAttempt(att);
        setDesign(att.draftDesign);

        const prob = await api.getProblem(att.problemId);
        setProblem(prob);
      } catch (err: any) {
        setError(err.message || 'Failed to load attempt');
      }
    };

    loadData();
  }, [attemptId]);

  // Debounced auto-save
  const triggerAutoSave = (updatedDesign: Design) => {
    setDesign(updatedDesign);
    setSaveStatus('unsaved');

    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);

    autoSaveTimeout.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await api.saveDraft(attemptId, updatedDesign);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('unsaved');
      }
    }, 1200);
  };

  const handleManualSave = async () => {
    if (!design) return;
    try {
      setSaveStatus('saving');
      await api.saveDraft(attemptId, design);
      setSaveStatus('saved');
    } catch (err: any) {
      setError('Save failed: ' + err.message);
      setSaveStatus('unsaved');
    }
  };

  const handleSubmit = async () => {
    if (!design || isSubmitting) return;

    // Quick client-side validation
    if (design.classes.length === 0 && design.interfaces.length === 0) {
      alert('Please add at least one class or interface before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionStep(1); // Freezing snapshot

      setTimeout(() => setSubmissionStep(2), 300); // Running deterministic rules
      setTimeout(() => setSubmissionStep(3), 700); // Qualitative analysis

      // Submit to backend
      const result = await api.submitAttempt(attemptId);
      setSubmissionStep(4); // Aggregating results

      setTimeout(() => {
        setIsSubmitting(false);
        onEvaluated(result);
      }, 500);
    } catch (err: any) {
      setIsSubmitting(false);
      setError('Submission error: ' + err.message);
    }
  };

  // --- Handlers for Classes ---
  const addClass = () => {
    if (!design) return;
    const newClass: ClassDefinition = {
      id: 'c_' + Date.now(),
      name: `Class${design.classes.length + 1}`,
      responsibility: 'Encapsulates domain logic for...',
      attributes: [],
      methods: [{ name: 'execute', returnType: 'void', parameters: '', visibility: 'public' }]
    };
    triggerAutoSave({ ...design, classes: [...design.classes, newClass] });
  };

  const updateClass = (index: number, updated: ClassDefinition) => {
    if (!design) return;
    const newClasses = [...design.classes];
    newClasses[index] = updated;
    triggerAutoSave({ ...design, classes: newClasses });
  };

  const removeClass = (index: number) => {
    if (!design) return;
    const removedName = design.classes[index].name;
    const newClasses = design.classes.filter((_, i) => i !== index);
    // clean up dangling relationships referencing this class
    const newRelationships = design.relationships.filter(
      (r) => r.source !== removedName && r.target !== removedName
    );
    triggerAutoSave({ ...design, classes: newClasses, relationships: newRelationships });
  };

  // --- Handlers for Interfaces ---
  const addInterface = () => {
    if (!design) return;
    const newIface: InterfaceDefinition = {
      id: 'i_' + Date.now(),
      name: `IStrategy${design.interfaces.length + 1}`,
      responsibility: 'Defines contract for...',
      methods: [{ name: 'handle', returnType: 'void', parameters: '', visibility: 'public' }]
    };
    triggerAutoSave({ ...design, interfaces: [...design.interfaces, newIface] });
  };

  const updateInterface = (index: number, updated: InterfaceDefinition) => {
    if (!design) return;
    const newIfaces = [...design.interfaces];
    newIfaces[index] = updated;
    triggerAutoSave({ ...design, interfaces: newIfaces });
  };

  const removeInterface = (index: number) => {
    if (!design) return;
    const removedName = design.interfaces[index].name;
    const newIfaces = design.interfaces.filter((_, i) => i !== index);
    const newRelationships = design.relationships.filter(
      (r) => r.source !== removedName && r.target !== removedName
    );
    triggerAutoSave({ ...design, interfaces: newIfaces, relationships: newRelationships });
  };

  // --- Handlers for Relationships ---
  const addRelationship = () => {
    if (!design) return;
    const entities = [...design.classes.map((c) => c.name), ...design.interfaces.map((i) => i.name)];
    if (entities.length < 2) {
      alert('You need at least 2 entities (classes or interfaces) to create a relationship.');
      return;
    }
    const newRel: RelationshipDefinition = {
      id: 'r_' + Date.now(),
      source: entities[0],
      target: entities[1] || entities[0],
      type: 'ASSOCIATION' as RelationType,
      cardinality: '1..1',
      description: ''
    };
    triggerAutoSave({ ...design, relationships: [...design.relationships, newRel] });
  };

  const updateRelationship = (index: number, updated: RelationshipDefinition) => {
    if (!design) return;
    const newRels = [...design.relationships];
    newRels[index] = updated;
    triggerAutoSave({ ...design, relationships: newRels });
  };

  const removeRelationship = (index: number) => {
    if (!design) return;
    const newRels = design.relationships.filter((_, i) => i !== index);
    triggerAutoSave({ ...design, relationships: newRels });
  };

  // --- Handlers for Patterns ---
  const addPattern = () => {
    if (!design) return;
    const newPat: PatternUsage = {
      pattern: 'Strategy Pattern',
      appliedTo: [],
      justification: 'Decouples volatile algorithm from coordinating context.'
    };
    triggerAutoSave({ ...design, patternsApplied: [...design.patternsApplied, newPat] });
  };

  const updatePattern = (index: number, updated: PatternUsage) => {
    if (!design) return;
    const newPats = [...design.patternsApplied];
    newPats[index] = updated;
    triggerAutoSave({ ...design, patternsApplied: newPats });
  };

  const removePattern = (index: number) => {
    if (!design) return;
    const newPats = design.patternsApplied.filter((_, i) => i !== index);
    triggerAutoSave({ ...design, patternsApplied: newPats });
  };

  if (error) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>Workspace Notice</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>
    );
  }

  if (!attempt || !design || !problem) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
        <p>Initializing Design Workbench...</p>
      </div>
    );
  }

  const allEntityNames = [
    ...design.classes.map((c) => c.name),
    ...design.interfaces.map((i) => i.name)
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* Workspace Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            <ArrowLeft size={15} />
            <span>Problems</span>
          </button>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
              {problem.title}
            </span>
            <span
              className="badge badge-status badge-draft"
              style={{ marginLeft: '0.75rem', fontSize: '0.7rem' }}
            >
              Attempt #{attempt.attemptNumber}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (confirm('Load pre-configured exemplary architectural design for this problem?')) {
                const exampleDesign = {
                  classes: [
                    {
                      id: 'c_ex_1',
                      name: problem.slug.includes('elevator') ? 'ElevatorController' : problem.slug.includes('vending') ? 'VendingMachine' : problem.slug.includes('ride') ? 'RideManager' : 'ParkingLot',
                      responsibility: 'Coordinates high-level requests and delegates execution to specialized strategy contracts',
                      attributes: [{ name: 'id', type: 'string', visibility: 'private' as const }],
                      methods: [
                        { name: 'processRequest', returnType: 'void', parameters: 'req: Request', visibility: 'public' as const },
                        { name: 'getStatus', returnType: 'string', parameters: '', visibility: 'public' as const }
                      ]
                    },
                    {
                      id: 'c_ex_2',
                      name: problem.slug.includes('elevator') ? 'ElevatorCar' : problem.slug.includes('vending') ? 'Inventory' : problem.slug.includes('ride') ? 'Trip' : 'ParkingSpot',
                      isAbstract: true,
                      responsibility: 'Core domain aggregate managing lifecycle states and capacity constraints',
                      attributes: [
                        { name: 'status', type: 'string', visibility: 'protected' as const },
                        { name: 'capacity', type: 'number', visibility: 'private' as const }
                      ],
                      methods: [
                        { name: 'occupy', returnType: 'void', parameters: '', visibility: 'public' as const },
                        { name: 'release', returnType: 'void', parameters: '', visibility: 'public' as const }
                      ]
                    },
                    {
                      id: 'c_ex_3',
                      name: problem.slug.includes('elevator') ? 'ScanDispatchStrategy' : problem.slug.includes('vending') ? 'CoinDispenser' : problem.slug.includes('ride') ? 'NearestDriverStrategy' : 'FlatRateFeePolicy',
                      responsibility: 'Implements concrete algorithmic strategy decoupled from coordinating context',
                      attributes: [],
                      methods: [
                        { name: 'compute', returnType: 'number', parameters: 'context: Context', visibility: 'public' as const }
                      ]
                    },
                    {
                      id: 'c_ex_4',
                      name: problem.slug.includes('elevator') ? 'FloorDisplay' : problem.slug.includes('vending') ? 'DisplayPanel' : problem.slug.includes('ride') ? 'DriverTracker' : 'DisplayBoard',
                      responsibility: 'Monitors real-time capacity and updates availability indicators for users',
                      attributes: [{ name: 'boardId', type: 'string', visibility: 'private' as const }],
                      methods: [
                        { name: 'notifyUpdate', returnType: 'void', parameters: 'tier: string, delta: number', visibility: 'public' as const }
                      ]
                    }
                  ],
                  interfaces: [
                    {
                      id: 'i_ex_1',
                      name: problem.slug.includes('elevator') ? 'IDispatchStrategy' : problem.slug.includes('vending') ? 'IPaymentProcessor' : problem.slug.includes('ride') ? 'IMatchingStrategy' : 'IFeePolicy',
                      responsibility: 'Polymorphic contract for pluggable behavioral policies (Dependency Inversion)',
                      methods: [
                        { name: 'compute', returnType: 'number', parameters: 'context: Context', visibility: 'public' as const }
                      ]
                    }
                  ],
                  relationships: [
                    {
                      id: 'r_ex_1',
                      source: problem.slug.includes('elevator') ? 'ElevatorController' : problem.slug.includes('vending') ? 'VendingMachine' : problem.slug.includes('ride') ? 'RideManager' : 'ParkingLot',
                      target: problem.slug.includes('elevator') ? 'ElevatorCar' : problem.slug.includes('vending') ? 'Inventory' : problem.slug.includes('ride') ? 'Trip' : 'ParkingSpot',
                      type: 'COMPOSITION' as const,
                      cardinality: '1..*'
                    },
                    {
                      id: 'r_ex_2',
                      source: problem.slug.includes('elevator') ? 'ScanDispatchStrategy' : problem.slug.includes('vending') ? 'CoinDispenser' : problem.slug.includes('ride') ? 'NearestDriverStrategy' : 'FlatRateFeePolicy',
                      target: problem.slug.includes('elevator') ? 'IDispatchStrategy' : problem.slug.includes('vending') ? 'IPaymentProcessor' : problem.slug.includes('ride') ? 'IMatchingStrategy' : 'IFeePolicy',
                      type: 'IMPLEMENTATION' as const
                    },
                    {
                      id: 'r_ex_3',
                      source: problem.slug.includes('elevator') ? 'ElevatorController' : problem.slug.includes('vending') ? 'VendingMachine' : problem.slug.includes('ride') ? 'RideManager' : 'ParkingLot',
                      target: problem.slug.includes('elevator') ? 'IDispatchStrategy' : problem.slug.includes('vending') ? 'IPaymentProcessor' : problem.slug.includes('ride') ? 'IMatchingStrategy' : 'IFeePolicy',
                      type: 'DEPENDENCY' as const
                    },
                    {
                      id: 'r_ex_4',
                      source: problem.slug.includes('elevator') ? 'ElevatorController' : problem.slug.includes('vending') ? 'VendingMachine' : problem.slug.includes('ride') ? 'RideManager' : 'ParkingLot',
                      target: problem.slug.includes('elevator') ? 'FloorDisplay' : problem.slug.includes('vending') ? 'DisplayPanel' : problem.slug.includes('ride') ? 'DriverTracker' : 'DisplayBoard',
                      type: 'COMPOSITION' as const
                    }
                  ],
                  patternsApplied: [
                    {
                      pattern: 'Strategy Pattern',
                      appliedTo: [
                        problem.slug.includes('elevator') ? 'IDispatchStrategy' : problem.slug.includes('vending') ? 'IPaymentProcessor' : problem.slug.includes('ride') ? 'IMatchingStrategy' : 'IFeePolicy'
                      ],
                      justification: 'Isolates changing business algorithms behind an abstraction, satisfying Open-Closed Principle.'
                    }
                  ],
                  assumptions: [
                    'Standard operational conditions with multi-point ingress/egress.',
                    'Concurrent access is synchronized at repository or controller boundary.'
                  ],
                  tradeoffs: 'Applied Strategy pattern with composition rather than inheritance to prevent class hierarchy explosion.',
                  extensibilityExplanation: 'Can introduce new policy implementations without modifying existing coordination classes.'
                };
                triggerAutoSave(exampleDesign);
              }
            }}
            title="Pre-fill an exemplary architecture to test evaluation"
            style={{ fontSize: '0.75rem', borderColor: 'var(--accent-primary)', color: '#c7d2fe' }}
          >
            <Sparkles size={13} color="var(--accent-cyan)" />
            <span>⚡ Load Example</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (confirm('Reset design to clean starter skeleton?')) {
                triggerAutoSave({
                  classes: JSON.parse(JSON.stringify(problem.starterTemplate.classes || [])),
                  interfaces: JSON.parse(JSON.stringify(problem.starterTemplate.interfaces || [])),
                  relationships: JSON.parse(JSON.stringify(problem.starterTemplate.relationships || [])),
                  patternsApplied: [],
                  assumptions: [...(problem.starterTemplate.assumptions || [])],
                  tradeoffs: problem.starterTemplate.tradeoffs || '',
                  extensibilityExplanation: problem.starterTemplate.extensibilityExplanation || ''
                });
              }
            }}
            style={{ fontSize: '0.75rem' }}
          >
            <span>Reset</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Clock size={13} />
            <span>
              {saveStatus === 'saved' ? 'Auto-Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved Changes'}
            </span>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleManualSave}>
            <Save size={14} />
            <span>Save Draft</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            <Send size={14} />
            <span>{isSubmitting ? 'Evaluating...' : 'Submit Design'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Workbench */}
      <div className="workspace-container" style={{ flex: 1 }}>
        {/* Left Column: Requirements Checklist */}
        <div
          className="workspace-panel"
          style={{ width: leftPanelCollapsed ? '48px' : '280px', transition: 'width 0.2s ease' }}
        >
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            {!leftPanelCollapsed && (
              <span className="panel-title">
                <CheckSquare size={16} color="var(--accent-primary)" />
                <span>Requirements</span>
              </span>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
            >
              {leftPanelCollapsed ? '→' : '←'}
            </button>
          </div>

          {!leftPanelCollapsed && (
            <div className="panel-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Ensure your classes, methods, and interfaces address these functional requirements:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {problem.functionalRequirements.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.825rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.25rem' }}>
                      {req.code}: {req.title}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem', lineHeight: 1.4 }}>
                      {req.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Column: Structured Entity Builder */}
        <div className="workspace-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Builder Navigation Tabs */}
          <div className="tab-list">
            <button
              className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
              onClick={() => setActiveTab('classes')}
            >
              <Layers size={16} />
              <span>Classes ({design.classes.length})</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'interfaces' ? 'active' : ''}`}
              onClick={() => setActiveTab('interfaces')}
            >
              <ShieldCheck size={16} />
              <span>Interfaces ({design.interfaces.length})</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'relationships' ? 'active' : ''}`}
              onClick={() => setActiveTab('relationships')}
            >
              <GitFork size={16} />
              <span>Relationships ({design.relationships.length})</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'patterns' ? 'active' : ''}`}
              onClick={() => setActiveTab('patterns')}
            >
              <Sparkles size={16} />
              <span>Patterns ({design.patternsApplied.length})</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={16} />
              <span>Trade-offs & Notes</span>
            </button>
          </div>

          <div className="panel-body" style={{ flex: 1, overflowY: 'auto' }}>
            {/* TAB 1: CLASSES */}
            {activeTab === 'classes' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Define domain entities, state fields, and behavioral methods.
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={addClass}>
                    <Plus size={14} />
                    <span>Add Class</span>
                  </button>
                </div>

                {design.classes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    <p>No classes defined yet. Click "Add Class" to start modeling.</p>
                  </div>
                ) : (
                  design.classes.map((cls, idx) => (
                    <div key={cls.id || idx} className="entity-card">
                      <div className="entity-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                          <input
                            type="text"
                            className="form-input mono-text"
                            value={cls.name}
                            onChange={(e) => updateClass(idx, { ...cls, name: e.target.value })}
                            placeholder="ClassName"
                            style={{ fontWeight: 700, width: '220px', padding: '0.4rem 0.6rem' }}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!cls.isAbstract}
                              onChange={(e) => updateClass(idx, { ...cls, isAbstract: e.target.checked })}
                            />
                            <span>abstract</span>
                          </label>
                        </div>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeClass(idx)}
                          title="Delete Class"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Responsibility */}
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Single Responsibility (SRP)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={cls.responsibility}
                          onChange={(e) => updateClass(idx, { ...cls, responsibility: e.target.value })}
                          placeholder="What is this class's single purpose in the domain?"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>

                      {/* Attributes */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span className="form-label" style={{ margin: 0 }}>
                            Attributes ({cls.attributes.length})
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => {
                              const newAttrs = [...cls.attributes, { name: 'field', type: 'string', visibility: 'private' as const }];
                              updateClass(idx, { ...cls, attributes: newAttrs });
                            }}
                          >
                            + Field
                          </button>
                        </div>
                        {cls.attributes.map((attr, aIdx) => (
                          <div key={aIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <select
                              className="form-select mono-text"
                              style={{ width: '80px', padding: '0.3rem', fontSize: '0.8rem' }}
                              value={attr.visibility || 'private'}
                              onChange={(e) => {
                                const newAttrs = [...cls.attributes];
                                newAttrs[aIdx].visibility = e.target.value as any;
                                updateClass(idx, { ...cls, attributes: newAttrs });
                              }}
                            >
                              <option value="private">- priv</option>
                              <option value="public">+ pub</option>
                              <option value="protected"># prot</option>
                            </select>
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="attributeName"
                              value={attr.name}
                              onChange={(e) => {
                                const newAttrs = [...cls.attributes];
                                newAttrs[aIdx].name = e.target.value;
                                updateClass(idx, { ...cls, attributes: newAttrs });
                              }}
                            />
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ width: '110px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="type"
                              value={attr.type}
                              onChange={(e) => {
                                const newAttrs = [...cls.attributes];
                                newAttrs[aIdx].type = e.target.value;
                                updateClass(idx, { ...cls, attributes: newAttrs });
                              }}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem' }}
                              onClick={() => {
                                const newAttrs = cls.attributes.filter((_, i) => i !== aIdx);
                                updateClass(idx, { ...cls, attributes: newAttrs });
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Methods */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span className="form-label" style={{ margin: 0 }}>
                            Methods ({cls.methods.length})
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => {
                              const newMethods = [...cls.methods, { name: 'newMethod', returnType: 'void', parameters: '', visibility: 'public' as const }];
                              updateClass(idx, { ...cls, methods: newMethods });
                            }}
                          >
                            + Method
                          </button>
                        </div>
                        {cls.methods.map((m, mIdx) => (
                          <div key={mIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="methodName"
                              value={m.name}
                              onChange={(e) => {
                                const newMethods = [...cls.methods];
                                newMethods[mIdx].name = e.target.value;
                                updateClass(idx, { ...cls, methods: newMethods });
                              }}
                            />
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ width: '130px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="params (e.g. id: string)"
                              value={m.parameters}
                              onChange={(e) => {
                                const newMethods = [...cls.methods];
                                newMethods[mIdx].parameters = e.target.value;
                                updateClass(idx, { ...cls, methods: newMethods });
                              }}
                            />
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ width: '90px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="returnType"
                              value={m.returnType}
                              onChange={(e) => {
                                const newMethods = [...cls.methods];
                                newMethods[mIdx].returnType = e.target.value;
                                updateClass(idx, { ...cls, methods: newMethods });
                              }}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem' }}
                              onClick={() => {
                                const newMethods = cls.methods.filter((_, i) => i !== mIdx);
                                updateClass(idx, { ...cls, methods: newMethods });
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: INTERFACES */}
            {activeTab === 'interfaces' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Define polymorphic abstractions and contracts for Dependency Inversion.
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={addInterface}>
                    <Plus size={14} />
                    <span>Add Interface</span>
                  </button>
                </div>

                {design.interfaces.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    <p>No interfaces defined. Add interfaces for polymorphic contracts (e.g., IPricingStrategy, IDispatcher).</p>
                  </div>
                ) : (
                  design.interfaces.map((iface, idx) => (
                    <div key={iface.id || idx} className="entity-card">
                      <div className="entity-header">
                        <input
                          type="text"
                          className="form-input mono-text"
                          value={iface.name}
                          onChange={(e) => updateInterface(idx, { ...iface, name: e.target.value })}
                          placeholder="IInterfaceName"
                          style={{ fontWeight: 700, width: '220px', padding: '0.4rem 0.6rem' }}
                        />
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeInterface(idx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Contract Responsibility</label>
                        <input
                          type="text"
                          className="form-input"
                          value={iface.responsibility}
                          onChange={(e) => updateInterface(idx, { ...iface, responsibility: e.target.value })}
                          placeholder="What contract does this interface mandate?"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span className="form-label" style={{ margin: 0 }}>
                            Contract Methods ({iface.methods.length})
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => {
                              const newMethods = [...iface.methods, { name: 'handleAction', returnType: 'void', parameters: '' }];
                              updateInterface(idx, { ...iface, methods: newMethods });
                            }}
                          >
                            + Method
                          </button>
                        </div>
                        {iface.methods.map((m, mIdx) => (
                          <div key={mIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="methodName"
                              value={m.name}
                              onChange={(e) => {
                                const newMethods = [...iface.methods];
                                newMethods[mIdx].name = e.target.value;
                                updateInterface(idx, { ...iface, methods: newMethods });
                              }}
                            />
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ width: '130px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="parameters"
                              value={m.parameters}
                              onChange={(e) => {
                                const newMethods = [...iface.methods];
                                newMethods[mIdx].parameters = e.target.value;
                                updateInterface(idx, { ...iface, methods: newMethods });
                              }}
                            />
                            <input
                              type="text"
                              className="form-input mono-text"
                              style={{ width: '90px', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                              placeholder="returnType"
                              value={m.returnType}
                              onChange={(e) => {
                                const newMethods = [...iface.methods];
                                newMethods[mIdx].returnType = e.target.value;
                                updateInterface(idx, { ...iface, methods: newMethods });
                              }}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem' }}
                              onClick={() => {
                                const newMethods = iface.methods.filter((_, i) => i !== mIdx);
                                updateInterface(idx, { ...iface, methods: newMethods });
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: RELATIONSHIPS */}
            {activeTab === 'relationships' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Connect entities with inheritance, realization, composition, or dependencies.
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={addRelationship}>
                    <Plus size={14} />
                    <span>Add Relationship</span>
                  </button>
                </div>

                {design.relationships.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    <p>No relationships declared. Connect entities to model interaction flow.</p>
                  </div>
                ) : (
                  design.relationships.map((rel, idx) => (
                    <div key={rel.id || idx} className="entity-card" style={{ padding: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Source */}
                        <select
                          className="form-select mono-text"
                          value={rel.source}
                          onChange={(e) => updateRelationship(idx, { ...rel, source: e.target.value })}
                          style={{ flex: 1, minWidth: '130px' }}
                        >
                          {allEntityNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>

                        {/* Relationship Type */}
                        <select
                          className="form-select"
                          value={rel.type}
                          onChange={(e) => updateRelationship(idx, { ...rel, type: e.target.value as any })}
                          style={{ width: '160px', fontWeight: 600, color: 'var(--accent-cyan)' }}
                        >
                          <option value="COMPOSITION">◆ Composition (has-a)</option>
                          <option value="AGGREGATION">◇ Aggregation (contains)</option>
                          <option value="IMPLEMENTATION">▷ Implements</option>
                          <option value="INHERITANCE">▶ Extends (is-a)</option>
                          <option value="DEPENDENCY">⇢ Depends On</option>
                        </select>

                        {/* Target */}
                        <select
                          className="form-select mono-text"
                          value={rel.target}
                          onChange={(e) => updateRelationship(idx, { ...rel, target: e.target.value })}
                          style={{ flex: 1, minWidth: '130px' }}
                        >
                          {allEntityNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>

                        {/* Cardinality */}
                        <input
                          type="text"
                          className="form-input mono-text"
                          style={{ width: '70px', padding: '0.4rem' }}
                          placeholder="1..*"
                          value={rel.cardinality || ''}
                          onChange={(e) => updateRelationship(idx, { ...rel, cardinality: e.target.value })}
                        />

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeRelationship(idx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: DESIGN PATTERNS */}
            {activeTab === 'patterns' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Declare design patterns applied and explain why they suit the design forces.
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={addPattern}>
                    <Plus size={14} />
                    <span>Add Pattern</span>
                  </button>
                </div>

                {design.patternsApplied.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    <p>No patterns declared. Applying recognized patterns (Strategy, State, Observer, Factory) boosts your design score.</p>
                  </div>
                ) : (
                  design.patternsApplied.map((pat, idx) => (
                    <div key={idx} className="entity-card">
                      <div className="entity-header">
                        <select
                          className="form-select"
                          value={pat.pattern}
                          onChange={(e) => updatePattern(idx, { ...pat, pattern: e.target.value })}
                          style={{ width: '220px', fontWeight: 700 }}
                        >
                          <option value="Strategy Pattern">Strategy Pattern</option>
                          <option value="State Pattern">State Pattern</option>
                          <option value="Factory Pattern">Factory Pattern</option>
                          <option value="Observer Pattern">Observer Pattern</option>
                          <option value="Command Pattern">Command Pattern</option>
                          <option value="Decorator Pattern">Decorator Pattern</option>
                          <option value="Facade Pattern">Facade Pattern</option>
                          <option value="Adapter Pattern">Adapter Pattern</option>
                        </select>

                        <button className="btn btn-danger btn-sm" onClick={() => removePattern(idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Applied To Entities (comma-separated)</label>
                        <input
                          type="text"
                          className="form-input mono-text"
                          placeholder="e.g. IFeePolicy, FlatRateFeePolicy"
                          value={pat.appliedTo.join(', ')}
                          onChange={(e) =>
                            updatePattern(idx, {
                              ...pat,
                              appliedTo: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                            })
                          }
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Architectural Justification</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Why is this pattern appropriate here? What problem does it solve?"
                          value={pat.justification}
                          onChange={(e) => updatePattern(idx, { ...pat, justification: e.target.value })}
                          rows={2}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: NOTES & TRADEOFFS */}
            {activeTab === 'notes' && (
              <div>
                <div className="form-group">
                  <label className="form-label">
                    Architectural Assumptions
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    What boundaries or simplifications did you assume? (e.g. single facility, thread safety handled in DB)
                  </p>
                  <textarea
                    className="form-textarea"
                    placeholder="List one assumption per line..."
                    value={design.assumptions.join('\n')}
                    onChange={(e) =>
                      triggerAutoSave({
                        ...design,
                        assumptions: e.target.value.split('\n').filter((l) => l.trim())
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Design Trade-Offs Considered
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Defend your choices. (e.g. Why composition over inheritance? Why Strategy over State?)
                  </p>
                  <textarea
                    className="form-textarea"
                    placeholder="Explain the trade-offs you balanced..."
                    value={design.tradeoffs}
                    onChange={(e) => triggerAutoSave({ ...design, tradeoffs: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Extensibility & Future Evolution
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    How will this design handle a new requirement without modifying existing core classes?
                  </p>
                  <textarea
                    className="form-textarea"
                    placeholder="How does this architecture support future growth?"
                    value={design.extensibilityExplanation}
                    onChange={(e) =>
                      triggerAutoSave({ ...design, extensibilityExplanation: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Mermaid Diagram & Quick Stats */}
        <div className="workspace-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <span className="panel-title">
              <Layers size={16} color="var(--accent-cyan)" />
              <span>Architecture Visualizer</span>
            </span>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', flex: 1 }}>
            <div style={{ flex: 1, minHeight: '320px', marginBottom: '1rem' }}>
              <LiveDiagram design={design} />
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                background: 'rgba(0,0,0,0.3)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
                fontSize: '0.8rem'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Classes: </span>
                <span style={{ fontWeight: 700, color: '#fff' }}>{design.classes.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Interfaces: </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{design.interfaces.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Couplings: </span>
                <span style={{ fontWeight: 700, color: '#fff' }}>{design.relationships.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Patterns: </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{design.patternsApplied.length}</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              <Send size={16} />
              <span>Submit for Hybrid Evaluation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submission Loading Overlay */}
      {isSubmitting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 13, 22, 0.88)',
            backdropFilter: 'blur(12px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '90%', textAlign: 'center', padding: '2.5rem' }}>
            <div className="logo-badge" style={{ margin: '0 auto 1.5rem', width: '56px', height: '56px' }}>
              <Layers size={30} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Evaluating Your Architecture
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Running hybrid deterministic checks and qualitative reasoning analysis...
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: submissionStep >= 1 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700 }}>✓</span> 1. Freezing immutable submission snapshot
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: submissionStep >= 2 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700 }}>✓</span> 2. Auditing graph integrity, cycles & coupling
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: submissionStep >= 3 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700 }}>✓</span> 3. Synthesizing semantic feedback & trade-offs
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: submissionStep >= 4 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700 }}>✓</span> 4. Persisting diagnostic scorecard
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
