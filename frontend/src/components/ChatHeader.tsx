import React from 'react';
import { MewsyLogo } from './MewsyLogo';
import { LanguageSelector } from './LanguageSelector';

// ── ChatHeader ─────────────────────────────────────────────────────────────────
// Top bar of the chat widget.
// Shows: sidebar toggle (full mode only), Mewsy logo + title, Help button,
// language selector, expand/compress/close buttons.

type WidgetMode = 'hidden' | 'quarter' | 'full';

interface ChatHeaderProps {
  widgetMode: WidgetMode;
  selectedLanguage: string | null;
  onClose: () => void;
  onExpand: () => void;
  onCompress: () => void;
  onToggleSidebar: () => void;
  onOpenHelp: () => void;
  onLanguageChange: (code: string) => void;
}

export function ChatHeader({
  widgetMode,
  selectedLanguage,
  onClose,
  onExpand,
  onCompress,
  onToggleSidebar,
  onOpenHelp,
  onLanguageChange,
}: ChatHeaderProps) {
  return (
    <div id="chat-widget-header">
      <div className="header-left">
        {/* Sidebar toggle — only shown in full mode */}
        <button id="btn-sidebar-toggle" className="header-icon-btn" title="Toggle sidebar" style={{ display: widgetMode === 'full' ? 'flex' : 'none' }} onClick={onToggleSidebar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <MewsyLogo className="header-logo-svg" width={28} height={28} stylePrefix="hst" />
        <span className="header-title">Mewsy</span>
      </div>
      <div className="header-right">
        {/* Help & Resources */}
        <button id="help-btn" className="header-btn" onClick={onOpenHelp}>Help &amp; Resources</button>
        {/* Language toggle */}
        <LanguageSelector selectedLanguage={selectedLanguage} onChange={onLanguageChange} />
        {/* Divider */}
        <div className="header-divider"></div>
        {/* Expand to full (shown in quarter mode) */}
        <button
          id="btn-expand"
          className="header-icon-btn"
          title="Full screen"
          style={{ display: widgetMode === 'quarter' ? 'flex' : 'none' }}
          onClick={onExpand}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>
        {/* Compress to quarter (shown in full mode) */}
        <button
          id="btn-compress"
          className="header-icon-btn"
          title="Side panel"
          style={{ display: widgetMode === 'full' ? 'flex' : 'none' }}
          onClick={onCompress}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
          </svg>
        </button>
        {/* Close */}
        <button id="btn-close" className="header-icon-btn" title="Close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
