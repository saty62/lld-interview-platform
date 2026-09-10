import React from 'react';
import { Layers, BookOpen, Clock, Compass } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="navbar">
      <div className="nav-brand" onClick={() => onNavigate('library')}>
        <div className="logo-badge">
          <Layers size={22} />
        </div>
        <div>
          <div className="nav-title">LLD Arena</div>
          <div className="nav-tagline">Low-Level Design Practice & Feedback</div>
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-btn ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onNavigate('library')}
        >
          <BookOpen size={16} />
          <span>Problem Library</span>
        </button>

        <button
          className={`nav-btn ${currentView === 'recent' ? 'active' : ''}`}
          onClick={() => onNavigate('recent')}
        >
          <Clock size={16} />
          <span>Recent Attempts</span>
        </button>

        <button
          className={`nav-btn ${currentView === 'methodology' ? 'active' : ''}`}
          onClick={() => onNavigate('methodology')}
        >
          <Compass size={16} />
          <span>Evaluation Philosophy</span>
        </button>
      </nav>
    </header>
  );
};
