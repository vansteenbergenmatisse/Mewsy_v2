import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  formatBotText,
  initAccordions,
  applyProgressiveReveal,
  checkListForButtons,
  sortButtonOptions,
} from '../utils/chat-utils';
import { uiStr } from '../config/chat-config';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'welcome' | 'thinking' | 'option-buttons';
  text: string;
  msgId?: string;
  isNewGroup?: boolean;
  options?: string[];
  questionText?: string | null;
  skipBody?: boolean;
  disabled?: boolean;
  clarifying?: boolean;
}

// ── Bot avatar ────────────────────────────────────────────────────────────────

function BotAvatar() {
  return <div className="bot-avatar">M</div>;
}

// ── Thinking bubble ───────────────────────────────────────────────────────────

function ThinkingBubble({ thinkingText }: { thinkingText: string }) {
  return (
    <div className="thinking-container">
      <div className="thinking-bubble">
        <div className="typing-dots">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
        <span className="thinking-text">{thinkingText}</span>
      </div>
    </div>
  );
}

// ── User message ──────────────────────────────────────────────────────────────

function UserMessage({ text }: { text: string }) {
  return (
    <div className="user-msg-container">
      <div className="user-msg">{text}</div>
      <div className="user-avatar">U</div>
    </div>
  );
}

// ── Bot text bubble ───────────────────────────────────────────────────────────

interface BotTextBubbleProps {
  text: string;
  msgId: string;
  isNewGroup: boolean;
  clarifying?: boolean;
  onAutoScroll: () => void;
  onDetectedButtons: (options: string[], questionText: string | null) => void;
}

function BotTextBubble({
  text,
  msgId,
  isNewGroup,
  clarifying,
  onAutoScroll,
  onDetectedButtons,
}: BotTextBubbleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  // Lazy useState — runs formatBotText exactly once on mount, never on re-renders
  const [htmlContent] = useState(() => formatBotText(text));

  useEffect(() => {
    const msgDiv = msgRef.current;
    if (!msgDiv || didInit.current) return;
    didInit.current = true;

    initAccordions(msgDiv);
    applyProgressiveReveal(msgDiv, onAutoScroll);

    const allSiblings = Array.from(
      document.querySelectorAll<HTMLElement>(`.bot-msg[data-msg-id="${msgId}"]`)
    );
    const result = checkListForButtons(msgDiv, allSiblings);
    if (result) {
      // Path B — clarifying question detected post-render: hide the entire text bubble
      containerRef.current?.remove();
      onDetectedButtons(result.options, result.questionText);
    }
    onAutoScroll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bot-msg-container" ref={containerRef}>
      {isNewGroup ? (
        <BotAvatar />
      ) : (
        <div style={{ width: '32px', flexShrink: 0 }} />
      )}
      <div className="bot-messages-group">
        <div
          ref={msgRef}
          className="bot-msg"
          data-msg-id={msgId}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}

// ── Welcome bubble ────────────────────────────────────────────────────────────

function WelcomeBubble({ text, isFirst }: { text: string; isFirst: boolean }) {
  return (
    <div className="bot-msg-container">
      {isFirst ? (
        <BotAvatar />
      ) : (
        <div style={{ width: '32px', flexShrink: 0 }} />
      )}
      <div className="bot-messages-group">
        <div className="bot-msg bot-question-bubble">{text}</div>
      </div>
    </div>
  );
}

// ── Option buttons ────────────────────────────────────────────────────────────

interface OptionButtonsProps {
  options: string[];
  questionText: string | null;
  msgId: string;
  skipBody: boolean;
  selectedLanguage: string | null;
  disabled: boolean;
  onSelect: (label: string, question: string | null) => void;
  onFocusInput: () => void;
}

const SOMETHING_ELSE_VARIANTS = /\b(something else|other|etwas anderes|autre chose|iets anders|anders)\b/i;

function OptionButtons({
  options,
  questionText,
  msgId,
  skipBody,
  selectedLanguage,
  disabled,
  onSelect,
  onFocusInput,
}: OptionButtonsProps) {
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  const { main: mainOptions, somethingElse: somethingElseLabel } = sortButtonOptions(options);
  const somethingElseText = somethingElseLabel ?? uiStr('somethingElse', selectedLanguage);

  const pencilIcon = (
    <span className="bot-option-pencil">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </span>
  );

  return (
    <>
      {skipBody && questionText && (
        <div className="bot-msg-container">
          <BotAvatar />
          <div className="bot-messages-group">
            <div className="bot-msg bot-question-bubble">{questionText}</div>
          </div>
        </div>
      )}
      <div className="bot-option-buttons" data-msg-id={msgId} data-question={questionText ?? ''}>
        {mainOptions.map((label, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <button
              key={idx}
              className={'bot-option-btn' + (isSelected ? ' selected' : '')}
              disabled={disabled || selectedIdx !== null}
              onClick={() => {
                if (selectedIdx !== null) return;
                setSelectedIdx(idx);
                onSelect(label, questionText);
              }}
            >
              <span className="bot-option-number">{idx + 1}</span>
              <span className="bot-option-label">{label}</span>
              <svg className="bot-option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          );
        })}
        <button
          className="bot-option-btn bot-option-something-else"
          disabled={disabled || selectedIdx !== null}
          onClick={onFocusInput}
        >
          {pencilIcon}
          <span className="bot-option-label">{somethingElseText}</span>
        </button>
      </div>
    </>
  );
}

// ── ChatBody ──────────────────────────────────────────────────────────────────

interface ChatBodyProps {
  messages: ChatMessage[];
  isThinking: boolean;
  thinkingText: string;
  selectedLanguage: string | null;
  isRequestInProgress: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onSendOptionMessage: (label: string, question: string | null) => void;
  onAddOptionButtons: (options: string[], questionText: string | null, msgId: string) => void;
}

export function ChatBody({
  messages,
  isThinking,
  thinkingText,
  selectedLanguage,
  isRequestInProgress,
  inputRef,
  onSendOptionMessage,
  onAddOptionButtons,
}: ChatBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = React.useState(false);

  const autoScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 80);
  };

  useEffect(() => {
    autoScroll();
  }, [messages.length, isThinking]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const welcomeGroupSeen = new Set<string>();

  return (
    <div id="messages-area" ref={bodyRef} onScroll={handleScroll}>
      {messages.map(msg => {
        if (msg.role === 'user') {
          return <UserMessage key={msg.id} text={msg.text} />;
        }

        if (msg.role === 'welcome') {
          const groupId = msg.msgId ?? msg.id;
          const isFirst = !welcomeGroupSeen.has(groupId);
          welcomeGroupSeen.add(groupId);
          return <WelcomeBubble key={msg.id} text={msg.text} isFirst={isFirst} />;
        }

        if (msg.role === 'bot') {
          return (
            <BotTextBubble
              key={msg.id}
              text={msg.text}
              msgId={msg.msgId ?? msg.id}
              isNewGroup={msg.isNewGroup ?? false}
              clarifying={msg.clarifying}
              onAutoScroll={autoScroll}
              onDetectedButtons={(options, questionText) => {
                onAddOptionButtons(options, questionText, msg.msgId ?? msg.id);
              }}
            />
          );
        }

        if (msg.role === 'option-buttons') {
          return (
            <OptionButtons
              key={msg.id}
              options={msg.options ?? []}
              questionText={msg.questionText ?? null}
              msgId={msg.msgId ?? msg.id}
              skipBody={msg.skipBody ?? false}
              selectedLanguage={selectedLanguage}
              disabled={msg.disabled ?? isRequestInProgress}
              onSelect={onSendOptionMessage}
              onFocusInput={focusInput}
            />
          );
        }

        return null;
      })}

      {isThinking && <ThinkingBubble thinkingText={thinkingText} />}

      {/* Scroll-to-latest pill */}
      <button
        className="scroll-to-latest-btn"
        style={{ display: showScrollBtn ? 'flex' : 'none' }}
        onClick={autoScroll}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span>{uiStr('scrollLatest', selectedLanguage)}</span>
      </button>
    </div>
  );
}
