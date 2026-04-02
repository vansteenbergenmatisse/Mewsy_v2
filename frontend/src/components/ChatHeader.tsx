import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import { uiStr } from '../config/chat-config';

type WidgetMode = 'hidden' | 'fullscreen' | 'side-panel';

interface ChatHeaderProps {
  widgetMode: WidgetMode;
  selectedLanguage: string | null;
  onClose: () => void;
  onOpenHelp: () => void;
  onLanguageChange: (code: string) => void;
  onToggleLayout: () => void;
  onToggleSidebar: () => void;
}

export function ChatHeader({
  widgetMode,
  selectedLanguage,
  onClose,
  onOpenHelp,
  onLanguageChange,
  onToggleLayout,
  onToggleSidebar,
}: ChatHeaderProps) {
  const s = (key: string) => uiStr(key, selectedLanguage);

  return (
    <div id="topbar">

      {/* Open sidebar — CSS controls visibility: hidden on desktop fullscreen, visible on desktop side-panel + all mobile */}
      {(widgetMode === 'fullscreen' || widgetMode === 'side-panel') && (
        <button className="topbar-open-sidebar" onClick={onToggleSidebar} title={s('openSidebar')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          {s('openSidebar')}
        </button>
      )}

      <div className="topbar-spacer" />

      {/* Help & Resources */}
      <button className="topbar-pill" onClick={onOpenHelp} title={s('helpResources')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {s('helpResources')}
      </button>

      <div className="topbar-divider" />

      {/* Language selector */}
      <LanguageSelector selectedLanguage={selectedLanguage} onChange={onLanguageChange} />

      <div className="topbar-divider" />

      {/* Layout toggle */}
      <button
        className="topbar-icon-btn"
        onClick={onToggleLayout}
        title={widgetMode === 'side-panel' ? s('expandFullscreen') : s('shrinkToPanel')}
      >
        {widgetMode === 'side-panel' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
          </svg>
        )}
      </button>

      {/* Close */}
      <button className="topbar-icon-btn danger" title="Close" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

    </div>
  );
}
