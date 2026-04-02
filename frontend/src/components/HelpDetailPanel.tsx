import React from 'react';
import { helpTopicContent } from '../help';

// ── HelpDetailPanel ────────────────────────────────────────────────────────────
// Shows the full content for a single help topic.
// Rendered on top of HelpPanel when the user selects an item.

interface HelpDetailPanelProps {
  show: boolean;
  topic: string | null;
  onBack: () => void;
  onCloseAll: () => void;
  onAskMewsie: (message: string) => void;
}

export function HelpDetailPanel({ show, topic, onBack, onCloseAll, onAskMewsie }: HelpDetailPanelProps) {
  const content = topic ? helpTopicContent[topic] : null;

  return (
    <div id="help-detail-panel" className={show ? 'show' : ''}>
      <div id="help-detail-header">
        <button id="help-detail-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span id="help-detail-title">{content ? content.title : 'Help Topic'}</span>
      </div>
      <div id="help-detail-content">
        {content && (
          <>
            {content.sections.map((section, idx) => (
              <div key={idx} className="help-detail-section">
                <h2>{section.heading}</h2>
                {section.content && <p>{section.content}</p>}
                {section.list && (
                  <ul>
                    {section.list.map((li, liIdx) => <li key={liIdx}>{li}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {content.cta && (
              <div className="help-detail-cta">
                <h3>{content.cta.title}</h3>
                <p>{content.cta.text}</p>
                <button onClick={() => { onAskMewsie(content.cta.message); }}>{content.cta.button}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
