import React, { useState } from 'react';

// ── HelpPanel ─────────────────────────────────────────────────────────────────
// Slide-over panel listing the help topics. Shown when the user clicks
// "Help & Resources". Each item click opens HelpDetailPanel.

interface HelpPanelProps {
  show: boolean;
  onBack: () => void;
  onSelectTopic: (topic: string) => void;
}

interface HelpItem {
  topic: string;
  icon: string;
  title: string;
  subtitle: string;
}

const HELP_ITEMS: HelpItem[] = [
  { topic: 'integration',    icon: '🔗', title: 'Mews x Omniboost Integration', subtitle: 'Overview of how the integration works' },
  { topic: 'onboarding',     icon: '🚀', title: 'Onboarding & Initial Setup',    subtitle: 'Get connected step by step' },
  { topic: 'mapping',        icon: '🗂️', title: 'Mapping Configuration',         subtitle: 'Set up your accounting mappings' },
  { topic: 'revenue-push',   icon: '📊', title: 'Full Revenue Push',             subtitle: 'Understanding revenue posting' },
  { topic: 'troubleshooting',icon: '🔧', title: 'Troubleshooting',              subtitle: 'Fix common issues' },
  { topic: 'contact',        icon: '📧', title: 'Contact Support',              subtitle: 'Get in touch with our team' },
];

export function HelpPanel({ show, onBack, onSelectTopic }: HelpPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = HELP_ITEMS.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return item.title.toLowerCase().includes(term) || item.subtitle.toLowerCase().includes(term);
  });

  const handleBack = () => {
    setSearchTerm('');
    onBack();
  };

  return (
    <div id="help-panel" className={show ? 'show' : ''}>
      <div id="help-panel-header">
        <button id="help-panel-back" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span>Help &amp; Resources</span>
      </div>
      <div id="help-panel-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search for help"
          id="help-search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div id="help-panel-content">
        {filtered.map(item => (
          <div
            key={item.topic}
            className="help-item"
            data-topic={item.topic}
            onClick={() => onSelectTopic(item.topic)}
            style={{ display: 'flex' }}
          >
            <div className="help-item-icon">{item.icon}</div>
            <div className="help-item-text">
              <div className="help-item-title">{item.title}</div>
              <div className="help-item-subtitle">{item.subtitle}</div>
            </div>
            <svg className="help-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
