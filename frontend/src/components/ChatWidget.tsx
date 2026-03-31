import React, { useRef, useEffect, useCallback } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatBody, ChatMessage } from './ChatBody';
import { ChatInput } from './ChatInput';
import { HelpPanel } from './HelpPanel';
import { HelpDetailPanel } from './HelpDetailPanel';
import { AttachedFile } from './ChatInput';

// ── Types ──────────────────────────────────────────────────────────────────────

type WidgetMode = 'hidden' | 'fullscreen' | 'side-panel';

interface ChatWidgetProps {
  widgetMode: WidgetMode;
  sidebarCollapsed: boolean;
  heroActive: boolean;
  heroExiting: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  thinkingText: string;
  selectedLanguage: string | null;
  isRequestInProgress: boolean;
  inputValue: string;
  inputPlaceholder: string;
  attachedFiles: AttachedFile[];
  showHelp: boolean;
  showHelpDetail: boolean;
  helpDetailTopic: string | null;
  onClose: () => void;
  onToggleSidebar: () => void;
  onToggleLayout: () => void;
  onNewChat: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  onSelectHelpTopic: (topic: string) => void;
  onCloseHelpDetail: () => void;
  onCloseAllHelp: () => void;
  onLanguageChange: (code: string) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickAction: (label: string) => void;
  onSendOptionMessage: (label: string, question: string | null) => void;
  onAddOptionButtons: (options: string[], questionText: string | null, msgId: string) => void;
  onAttachFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
}

// ── Hero section ───────────────────────────────────────────────────────────────

interface HeroSectionProps {
  onQuickAction: (label: string) => void;
}

const QUICK_ACTIONS = [
  {
    label: 'Onboarding help',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    label: 'Search the docs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    label: 'Configure mapping',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    label: 'Troubleshoot issue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Billing & plans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
] as const;

function HeroSection({ onQuickAction }: HeroSectionProps) {
  return (
    <div className="hero-state">
      <h1 className="hero-headline">
        How can I <span className="highlight">help</span> you today?
      </h1>
      <div className="hero-actions">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.label}
            className="quick-btn"
            onClick={() => onQuickAction(action.label)}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Fullscreen hero (only in fullscreen mode) ───────────────────────────────

interface FullscreenHeroProps {
  exiting?: boolean;
  inputValue: string;
  inputPlaceholder: string;
  attachedFiles: AttachedFile[];
  isRequestInProgress: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onQuickAction: (label: string) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onAttachFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
}

function FullscreenHeroSection({
  exiting,
  inputValue,
  inputPlaceholder,
  attachedFiles,
  isRequestInProgress,
  inputRef,
  onQuickAction,
  onInputChange,
  onSend,
  onAttachFile,
  onRemoveFile,
}: FullscreenHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = '1px';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [inputValue, inputRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isRequestInProgress && inputValue.trim()) onSend();
    }
  }, [isRequestInProgress, inputValue, onSend]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(f => onAttachFile(f));
    e.target.value = '';
  };

  return (
    <div className={`hero-fullscreen${exiting ? ' hero-exiting' : ''}`}>
      <h1 className="hero-fullscreen-title">
        How can I <span className="highlight">help</span> you today?
      </h1>

      <div className="hero-input-box">
        {attachedFiles.length > 0 && (
          <div className="file-chips">
            {attachedFiles.map(f => (
              <div key={f.id} className="file-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                <span className="file-chip-name">{f.name}</span>
                <button className="file-chip-remove" onClick={() => onRemoveFile(f.id)} aria-label={`Remove ${f.name}`}>×</button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          className="hero-textarea"
          placeholder={inputPlaceholder}
          value={inputValue}
          disabled={isRequestInProgress}
          rows={1}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="hero-input-footer">
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple style={{ display: 'none' }} onChange={handleFileChange} />
          <button className="hero-attach-btn" type="button" onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <div className="hero-input-right">
            <button className="hero-voice-btn" type="button" title="Voice input — coming soon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button
              className="hero-send-btn"
              type="button"
              disabled={isRequestInProgress || !inputValue.trim()}
              onClick={onSend}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="hero-pills">
        {QUICK_ACTIONS.map(action => (
          <button key={action.label} className="hero-pill-btn" onClick={() => onQuickAction(action.label)}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── ChatWidget ─────────────────────────────────────────────────────────────────

export function ChatWidget({
  widgetMode,
  sidebarCollapsed,
  heroActive,
  heroExiting,
  messages,
  isThinking,
  thinkingText,
  selectedLanguage,
  isRequestInProgress,
  inputValue,
  inputPlaceholder,
  attachedFiles,
  showHelp,
  showHelpDetail,
  helpDetailTopic,
  onClose,
  onToggleSidebar,
  onToggleLayout,
  onNewChat,
  onOpenHelp,
  onCloseHelp,
  onSelectHelpTopic,
  onCloseHelpDetail,
  onCloseAllHelp,
  onLanguageChange,
  onInputChange,
  onSend,
  onQuickAction,
  onSendOptionMessage,
  onAddOptionButtons,
  onAttachFile,
  onRemoveFile,
}: ChatWidgetProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (widgetMode === 'hidden') return null;

  return (
    <div id="Mewsie-app" className={widgetMode}>

      {/* ── Sidebar — only in fullscreen; expanded/collapsed via class ── */}
      {widgetMode === 'fullscreen' && !sidebarCollapsed && (
        <div id="sidebar-backdrop" onClick={onToggleSidebar} />
      )}

      {widgetMode === 'fullscreen' && (
        <div id="sidebar" className={sidebarCollapsed ? '' : 'expanded'}>

          {/* Header: "Mewsie" big + toggle at right when expanded; just toggle centered when collapsed */}
          <div className="sidebar-header">
            <span className="sidebar-brand-name">Mewsie</span>
            <button className="sidebar-toggle-btn" onClick={onToggleSidebar} title="Collapse sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <button className="sidebar-row sidebar-row--new" onClick={onNewChat} title="New chat">
            <span className="sidebar-new-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </span>
            <span className="row-label">New chat</span>
          </button>

          <button className="sidebar-row sidebar-row--muted" title="Search (coming soon)" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="row-label">Search</span>
          </button>

          <button className="sidebar-row" onClick={onOpenHelp} title="Help & Resources">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
            <span className="row-label">Help & Resources</span>
          </button>

          <button className="sidebar-row sidebar-row--muted" title="Chats (coming soon)" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="row-label">Chats</span>
          </button>

          <button className="sidebar-row sidebar-row--muted" title="Projects (coming soon)" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            <span className="row-label">Projects</span>
          </button>

          <button className="sidebar-row sidebar-row--muted" title="Settings (coming soon)" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="row-label">Settings</span>
          </button>

          <button className="sidebar-row sidebar-row--muted" title="Developer (coming soon)" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            <span className="row-label">Developer</span>
          </button>

          {/* ── Bottom ── */}
          <div className="sidebar-bottom">
            <button className="sidebar-row sidebar-row--muted" title="Export (coming soon)" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span className="row-label">Export</span>
            </button>
            <div className="sidebar-avatar" title="My account">
              <div className="sidebar-avatar-icon">MV</div>
            </div>
          </div>

        </div>
      )}

      {/* ── Chat window ── */}
      <div id="chat-window">

        <ChatHeader
          widgetMode={widgetMode}
          selectedLanguage={selectedLanguage}
          onClose={onClose}
          onOpenHelp={onOpenHelp}
          onLanguageChange={onLanguageChange}
          onToggleLayout={onToggleLayout}
          onToggleSidebar={onToggleSidebar}
        />

        {/* Body area */}
        {(heroActive || heroExiting) && widgetMode === 'fullscreen' ? (
          <FullscreenHeroSection
            exiting={heroExiting}
            inputRef={inputRef}
            inputValue={inputValue}
            inputPlaceholder={inputPlaceholder}
            attachedFiles={attachedFiles}
            isRequestInProgress={isRequestInProgress}
            onQuickAction={onQuickAction}
            onInputChange={onInputChange}
            onSend={onSend}
            onAttachFile={onAttachFile}
            onRemoveFile={onRemoveFile}
          />
        ) : heroActive ? (
          <HeroSection onQuickAction={onQuickAction} />
        ) : (
          <ChatBody
            messages={messages}
            isThinking={isThinking}
            thinkingText={thinkingText}
            selectedLanguage={selectedLanguage}
            isRequestInProgress={isRequestInProgress}
            inputRef={inputRef}
            onSendOptionMessage={onSendOptionMessage}
            onAddOptionButtons={onAddOptionButtons}
          />
        )}

        {/* Help panels slide over the body */}
        <HelpPanel
          show={showHelp}
          onBack={onCloseHelp}
          onSelectTopic={onSelectHelpTopic}
        />
        <HelpDetailPanel
          show={showHelpDetail}
          topic={helpDetailTopic}
          onBack={onCloseHelpDetail}
          onCloseAll={onCloseAllHelp}
        />

        {/* Warning toasts */}
        <div id="timeout-warning">Mewsie is taking longer than expected. Please try again.</div>
        <div id="empty-warning">Please enter a message first.</div>

        {/* Bottom input — hidden in fullscreen hero (input is embedded in hero) */}
        {!((heroActive || heroExiting) && widgetMode === 'fullscreen') && (
          <ChatInput
            ref={inputRef}
            value={inputValue}
            placeholder={inputPlaceholder}
            disabled={isRequestInProgress}
            selectedLanguage={selectedLanguage}
            attachedFiles={attachedFiles}
            onChange={onInputChange}
            onSend={onSend}
            onAttachFile={onAttachFile}
            onRemoveFile={onRemoveFile}
          />
        )}

      </div>
    </div>
  );
}
