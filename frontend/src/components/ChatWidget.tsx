import React, { useRef } from 'react';
import { MewsyLogo } from './MewsyLogo';
import { ChatHeader } from './ChatHeader';
import { ChatBody, ChatMessage } from './ChatBody';
import { ChatInput } from './ChatInput';
import { HelpPanel } from './HelpPanel';
import { HelpDetailPanel } from './HelpDetailPanel';

// ── ChatWidget ─────────────────────────────────────────────────────────────────
// The main widget panel (hidden until widgetMode !== 'hidden').
// Contains: sidebar, header, message body, help panels, input footer.

type WidgetMode = 'hidden' | 'quarter' | 'full';

interface ChatWidgetProps {
  widgetMode: WidgetMode;
  messages: ChatMessage[];
  isThinking: boolean;
  thinkingText: string;
  selectedLanguage: string | null;
  isRequestInProgress: boolean;
  inputValue: string;
  inputPlaceholder: string;
  showHelp: boolean;
  showHelpDetail: boolean;
  helpDetailTopic: string | null;
  sidebarOpen: boolean;
  onClose: () => void;
  onExpand: () => void;
  onCompress: () => void;
  onToggleSidebar: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  onSelectHelpTopic: (topic: string) => void;
  onCloseHelpDetail: () => void;
  onCloseAllHelp: () => void;
  onLanguageChange: (code: string) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSendOptionMessage: (label: string, question: string | null) => void;
  onAddOptionButtons: (options: string[], questionText: string | null, msgId: string) => void;
}

export function ChatWidget({
  widgetMode,
  messages,
  isThinking,
  thinkingText,
  selectedLanguage,
  isRequestInProgress,
  inputValue,
  inputPlaceholder,
  showHelp,
  showHelpDetail,
  helpDetailTopic,
  sidebarOpen,
  onClose,
  onExpand,
  onCompress,
  onToggleSidebar,
  onOpenHelp,
  onCloseHelp,
  onSelectHelpTopic,
  onCloseHelpDetail,
  onCloseAllHelp,
  onLanguageChange,
  onInputChange,
  onSend,
  onSendOptionMessage,
  onAddOptionButtons,
}: ChatWidgetProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (widgetMode === 'hidden') return null;

  return (
    <div id="chat-widget-container" data-mode={widgetMode}>

      {/* Sidebar — only visible in full mode, collapsed by default */}
      <div id="mewsy-sidebar" className={sidebarOpen ? 'open' : ''}>
        <div className="sidebar-logo-area">
          <MewsyLogo className="sidebar-logo-svg" width={26} height={26} stylePrefix="slst" />
          <span className="sidebar-app-name">Mewsy</span>
        </div>
      </div>

      {/* Main chat panel */}
      <div id="mewsy-main">
        <ChatHeader
          widgetMode={widgetMode}
          selectedLanguage={selectedLanguage}
          onClose={onClose}
          onExpand={onExpand}
          onCompress={onCompress}
          onToggleSidebar={onToggleSidebar}
          onOpenHelp={onOpenHelp}
          onLanguageChange={onLanguageChange}
        />

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

        {/* Help panel (slides over the body) */}
        <HelpPanel
          show={showHelp}
          onBack={onCloseHelp}
          onSelectTopic={onSelectHelpTopic}
        />

        {/* Help detail panel (slides over the help panel) */}
        <HelpDetailPanel
          show={showHelpDetail}
          topic={helpDetailTopic}
          onBack={onCloseHelpDetail}
          onCloseAll={onCloseAllHelp}
        />

        {/* Timeout warning toast */}
        <div id="timeout-warning">Mewsy is taking longer than expected. Please try again.</div>
        {/* Empty input warning toast */}
        <div id="empty-warning">Please enter a message first.</div>

        <ChatInput
          value={inputValue}
          placeholder={inputPlaceholder}
          disabled={isRequestInProgress}
          selectedLanguage={selectedLanguage}
          onChange={onInputChange}
          onSend={onSend}
        />
      </div>
    </div>
  );
}
