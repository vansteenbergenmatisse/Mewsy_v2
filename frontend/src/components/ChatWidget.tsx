import React, { useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { Sidebar } from './Sidebar';
import { ChatBody, ChatMessage } from './ChatBody';
import { ChatInput } from './ChatInput';
import { HelpPanel } from './HelpPanel';
import { HelpDetailPanel } from './HelpDetailPanel';
import { AttachedFile } from './ChatInput';
import { uiStr, QUICK_ACTION_KEYS, getQuickActionQuery } from '../config/chat-config';

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
  onCloseSidebar: () => void;
  onToggleLayout: () => void;
  onNewChat: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  onSelectHelpTopic: (topic: string) => void;
  onCloseHelpDetail: () => void;
  onCloseAllHelp: () => void;
  onAskMewsie: (message: string) => void;
  onLanguageChange: (code: string) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickAction: (label: string) => void;
  onSendOptionMessage: (label: string, question: string | null) => void;
  onAddOptionButtons: (options: string[], questionText: string | null, msgId: string) => void;
  onSendClarifyAnswers: (formatted: string, summary: { q: string; a: string }[]) => void;
  onAttachFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
}

// ── Quick action icons (order matches QUICK_ACTION_KEYS in chat-config) ────────

const QUICK_ACTION_ICONS = [
  <span className="qa-icon-wrap">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  </span>,
  <span className="qa-icon-wrap">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  </span>,
  <span className="qa-icon-wrap">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  </span>,
  <span className="qa-icon-wrap">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  </span>,
  <span className="qa-icon-wrap">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  </span>,
];

// ── Hero section ───────────────────────────────────────────────────────────────

interface HeroSectionProps {
  selectedLanguage: string | null;
  onQuickAction: (label: string) => void;
}

function HeroSection({ selectedLanguage, onQuickAction }: HeroSectionProps) {
  const s = (key: string) => uiStr(key, selectedLanguage);
  return (
    <div className="hero-state">
      <h1 className="hero-headline">
        {s('heroHeadlinePre')}<span className="highlight">{s('heroHighlight')}</span>{s('heroHeadlinePost')}
      </h1>
      <div className="hero-actions">
        {QUICK_ACTION_KEYS.map((key, idx) => {
          const label = s(key);
          const query = getQuickActionQuery(key, selectedLanguage);
          return (
            <button key={key} className="quick-btn" onClick={() => onQuickAction(query)}>
              {QUICK_ACTION_ICONS[idx]}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Fullscreen hero (only in fullscreen mode) ───────────────────────────────

interface FullscreenHeroProps {
  exiting?: boolean;
  selectedLanguage: string | null;
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
  selectedLanguage,
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
  const s = (key: string) => uiStr(key, selectedLanguage);

  return (
    <div className={`hero-fullscreen${exiting ? ' hero-exiting' : ''}`}>
      <h1 className="hero-fullscreen-title">
        {s('heroHeadlinePre')}<span className="highlight">{s('heroHighlight')}</span>{s('heroHeadlinePost')}
      </h1>

      <ChatInput
        ref={inputRef}
        hero
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

      <div className="hero-pills">
        {QUICK_ACTION_KEYS.map((key, idx) => {
          const label = s(key);
          const query = getQuickActionQuery(key, selectedLanguage);
          return (
            <button key={key} className="hero-pill-btn" onClick={() => onQuickAction(query)}>
              {QUICK_ACTION_ICONS[idx]}
              {label}
            </button>
          );
        })}
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
  onCloseSidebar,
  onToggleLayout,
  onNewChat,
  onOpenHelp,
  onCloseHelp,
  onSelectHelpTopic,
  onCloseHelpDetail,
  onCloseAllHelp,
  onAskMewsie,
  onLanguageChange,
  onInputChange,
  onSend,
  onQuickAction,
  onSendOptionMessage,
  onAddOptionButtons,
  onSendClarifyAnswers,
  onAttachFile,
  onRemoveFile,
}: ChatWidgetProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const s = (key: string) => uiStr(key, selectedLanguage);

  if (widgetMode === 'hidden') return null;

  return (
    <div id="Mewsie-app" className={widgetMode}>

      {/* In fullscreen: sidebar is a flex sibling (left column) */}
      {widgetMode !== 'side-panel' && (
        <Sidebar
          collapsed={sidebarCollapsed}
          selectedLanguage={selectedLanguage}
          onToggle={onToggleSidebar}
          onClose={onCloseSidebar}
          onNewChat={onNewChat}
          onOpenHelp={onOpenHelp}
        />
      )}

      {/* ── Chat window ── */}
      <div id="chat-window">

        {/* In side-panel: sidebar overlays inside chat-window; overflow:hidden clips it when hidden */}
        {widgetMode === 'side-panel' && (
          <Sidebar
            collapsed={sidebarCollapsed}
            selectedLanguage={selectedLanguage}
            onToggle={onToggleSidebar}
            onClose={onCloseSidebar}
            onNewChat={onNewChat}
            onOpenHelp={onOpenHelp}
          />
        )}

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
            selectedLanguage={selectedLanguage}
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
          <HeroSection selectedLanguage={selectedLanguage} onQuickAction={onQuickAction} />
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
            onSendClarifyAnswers={onSendClarifyAnswers}
          />
        )}

        {/* Help panels slide over the body */}
        <HelpPanel
          show={showHelp}
          selectedLanguage={selectedLanguage}
          onBack={onCloseHelp}
          onSelectTopic={onSelectHelpTopic}
        />
        <HelpDetailPanel
          show={showHelpDetail}
          topic={helpDetailTopic}
          selectedLanguage={selectedLanguage}
          onBack={onCloseHelpDetail}
          onCloseAll={onCloseAllHelp}
          onAskMewsie={onAskMewsie}
        />

        {/* Warning toasts */}
        <div id="timeout-warning">{s('timeoutWarning')}</div>
        <div id="empty-warning">{s('emptyWarning')}</div>

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
