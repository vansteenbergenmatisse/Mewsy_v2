import React from 'react';
import { uiStr } from '../config/chat-config';

// ── Sidebar ────────────────────────────────────────────────────────────────────
// Single source of truth for the sidebar in every layout and screen size.
// CSS handles show/hide and overlay vs. persistent behaviour — this component
// stays identical whether in fullscreen, side-panel, desktop, or mobile.
//
// Props:
//   collapsed   — true = icon-only strip on desktop / hidden off-screen on mobile
//   onToggle    — toggles open/closed; used by the sidebar-toggle-btn header button
//   onClose     — always collapses the sidebar (backdrop, nav actions)
//   onNewChat   — starts a new conversation
//   onOpenHelp  — opens the Help & Resources panel

interface SidebarProps {
  collapsed: boolean;
  selectedLanguage: string | null;
  onToggle: () => void;
  onClose: () => void;
  onNewChat: () => void;
  onOpenHelp: () => void;
}

export function Sidebar({ collapsed, selectedLanguage, onToggle, onClose, onNewChat, onOpenHelp }: SidebarProps) {
  const s = (key: string) => uiStr(key, selectedLanguage);

  return (
    <>
      {/* Backdrop — dims content behind the open sidebar on mobile overlay */}
      {!collapsed && <div id="sidebar-backdrop" onClick={onClose} />}

      <div id="sidebar" className={collapsed ? '' : 'expanded'}>

        <div className="sidebar-header">
          <span className="sidebar-brand-name">Mewsie</span>
          <button className="sidebar-toggle-btn" onClick={onToggle} title={s('shrinkToPanel')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <button className="sidebar-row sidebar-row--new" onClick={() => { onNewChat(); onClose(); }} title={s('newChat')}>
          <span className="sidebar-new-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
          <span className="row-label">{s('newChat')}</span>
        </button>

        <button className="sidebar-row sidebar-row--muted" title={s('search')} disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="row-label">{s('search')}</span>
        </button>

        <button className="sidebar-row" onClick={() => { onOpenHelp(); onClose(); }} title={s('helpResources')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <span className="row-label">{s('helpResources')}</span>
        </button>

        <button className="sidebar-row sidebar-row--muted" title={s('chats')} disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="row-label">{s('chats')}</span>
        </button>

        <button className="sidebar-row sidebar-row--muted" title={s('settings')} disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span className="row-label">{s('settings')}</span>
        </button>

        {/* ── Bottom ── */}
        <div className="sidebar-bottom">
          <div className="sidebar-avatar" title="My account">
            <div className="sidebar-avatar-icon">MV</div>
          </div>
        </div>

      </div>
    </>
  );
}
