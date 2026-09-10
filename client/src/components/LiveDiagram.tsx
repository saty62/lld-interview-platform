import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Design } from '../../shared/types.js';
import { Eye, Copy, Check, RefreshCw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#090d16',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: 'rgba(99, 102, 241, 0.4)',
    lineColor: '#06b6d4',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a'
  },
  securityLevel: 'loose'
});

interface LiveDiagramProps {
  design: Design;
}

export const LiveDiagram: React.FC<LiveDiagramProps> = ({ design }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Helper to generate Mermaid UML classDiagram string
  const generateMermaidCode = (): string => {
    const lines: string[] = ['classDiagram', 'direction TB'];

    // Sanitize identifier
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_]/g, '_');

    // Render Interfaces
    for (const iface of design.interfaces) {
      const id = sanitize(iface.name);
      if (!id) continue;
      lines.push(`class ${id} {`);
      lines.push(`    <<interface>>`);
      for (const m of iface.methods) {
        const mName = sanitize(m.name);
        lines.push(`    +${mName}() ${sanitize(m.returnType || 'void')}`);
      }
      lines.push(`}`);
    }

    // Render Classes
    for (const cls of design.classes) {
      const id = sanitize(cls.name);
      if (!id) continue;
      lines.push(`class ${id} {`);
      if (cls.isAbstract) {
        lines.push(`    <<abstract>>`);
      }
      for (const a of cls.attributes) {
        const vis = a.visibility === 'private' ? '-' : a.visibility === 'protected' ? '#' : '+';
        lines.push(`    ${vis}${sanitize(a.name)}: ${sanitize(a.type || 'string')}`);
      }
      for (const m of cls.methods) {
        const vis = m.visibility === 'private' ? '-' : m.visibility === 'protected' ? '#' : '+';
        lines.push(`    ${vis}${sanitize(m.name)}() ${sanitize(m.returnType || 'void')}`);
      }
      lines.push(`}`);
    }

    // Render Relationships
    for (const r of design.relationships) {
      const src = sanitize(r.source);
      const tgt = sanitize(r.target);
      if (!src || !tgt) continue;

      let arrow = '-->';
      switch (r.type) {
        case 'INHERITANCE':
          arrow = '--|>';
          break;
        case 'IMPLEMENTATION':
          arrow = '..|>';
          break;
        case 'COMPOSITION':
          arrow = '*--';
          break;
        case 'AGGREGATION':
          arrow = 'o--';
          break;
        case 'DEPENDENCY':
          arrow = '..>';
          break;
      }

      const card = r.cardinality ? ` "${r.cardinality}"` : '';
      const desc = r.description ? ` : ${r.description.replace(/[^a-zA-Z0-9_ ]/g, '')}` : '';
      lines.push(`${src} ${arrow}${card} ${tgt}${desc}`);
    }

    return lines.join('\n');
  };

  const mermaidCode = generateMermaidCode();

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      try {
        setRenderError(null);
        const uniqueId = `mermaid-uml-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, mermaidCode);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        if (isMounted) {
          setRenderError('Refining diagram syntax...');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [mermaidCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEntities = design.classes.length + design.interfaces.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={16} color="#06b6d4" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Live UML Class Diagram
          </span>
          <span className="badge badge-status badge-evaluated" style={{ fontSize: '0.65rem' }}>
            {totalEntities} Entities
          </span>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleCopy} title="Copy Mermaid Definition">
          {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy UML'}</span>
        </button>
      </div>

      <div className="diagram-container" style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
        {totalEntities === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <RefreshCw size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p>Declare classes and interfaces to render UML diagram.</p>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }} />
        )}

        {renderError && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              fontSize: '0.7rem',
              color: 'var(--accent-amber)',
              background: 'rgba(0,0,0,0.6)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}
          >
            {renderError}
          </div>
        )}
      </div>
    </div>
  );
};
