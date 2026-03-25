import React, { useEffect, useRef, useCallback } from 'react';
import { MewsyLogo } from './MewsyLogo';
import {
  formatBotText,
  initAccordions,
  applyProgressiveReveal,
  checkListForButtons,
} from '../utils/chat-utils';
import { uiStr } from '../config/chat-config';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'welcome' | 'thinking' | 'option-buttons';
  text: string;
  msgId?: string;         // groups bot bubbles from the same response
  isNewGroup?: boolean;   // first bubble in a new bot group → show avatar
  options?: string[];     // option button labels
  questionText?: string | null;
  skipBody?: boolean;     // option-buttons message that had no body
  isWelcome?: boolean;    // flag so welcome bubbles never show the avatar on subsequent bubbles
}

// ── Bot avatar ────────────────────────────────────────────────────────────────

function BotAvatar() {
  return (
    <div className="bot-avatar">
      <MewsyLogo stylePrefix="ba" />
    </div>
  );
}

// ── Thinking bubble ───────────────────────────────────────────────────────────

interface ThinkingBubbleProps {
  thinkingText: string;
}

function ThinkingBubble({ thinkingText }: ThinkingBubbleProps) {
  return (
    <div id="thinking-bubble" className="thinking-container">
      <div className="thinking-bubble">
        <div className="typing-dots">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
        <span className="thinking-text">{thinkingText}</span>
      </div>
    </div>
  );
}

// ── User message ─────────────────────────────────────────────────────────────

function UserMessage({ text }: { text: string }) {
  return (
    <div className="user-msg-container">
      <div className="user-msg">{text}</div>
      <div className="user-avatar">U</div>
    </div>
  );
}

// ── Bot text bubble ───────────────────────────────────────────────────────────
// Renders HTML from formatBotText, then runs initAccordions + applyProgressiveReveal
// in a post-render effect.

interface BotTextBubbleProps {
  text: string;
  msgId: string;
  isNewGroup: boolean;
  onAutoScroll: () => void;
  onDetectedButtons: (options: string[], questionText: string | null) => void;
  allMsgIds: string[]; // used to find sibling bubbles for checkListForButtons
}

function BotTextBubble({
  text,
  msgId,
  isNewGroup,
  onAutoScroll,
  onDetectedButtons,
  allMsgIds,
}: BotTextBubbleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  const htmlContent = formatBotText(text);

  useEffect(() => {
    const msgDiv = msgRef.current;
    if (!msgDiv || didInit.current) return;
    didInit.current = true;

    initAccordions(msgDiv);
    applyProgressiveReveal(msgDiv, onAutoScroll);

    // Collect sibling bot bubbles (same msgId) from the DOM for checkListForButtons
    const allSiblings = Array.from(
      document.querySelectorAll<HTMLElement>(`.bot-msg[data-msg-id="${msgId}"]`)
    );
    const result = checkListForButtons(msgDiv, allSiblings);
    if (result) {
      // Remove the empty container if the bubble is now empty after list removal
      if (!msgDiv.textContent?.trim()) {
        containerRef.current?.remove();
      }
      onDetectedButtons(result.options, result.questionText);
    }
    onAutoScroll();
  }, []); // run once after initial mount

  return (
    <div className="bot-msg-container" ref={containerRef}>
      {isNewGroup ? (
        <BotAvatar />
      ) : (
        <div style={{ width: '28px', flexShrink: 0 }} />
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

// ── Welcome text bubble ───────────────────────────────────────────────────────
// Simple text bubble for welcome messages (no HTML formatting, no accordion).

interface WelcomeBubbleProps {
  text: string;
  isFirst: boolean;
}

function WelcomeBubble({ text, isFirst }: WelcomeBubbleProps) {
  return (
    <div className="bot-msg-container">
      {isFirst ? (
        <BotAvatar />
      ) : (
        <div style={{ width: '28px', flexShrink: 0 }} />
      )}
      <div className="bot-messages-group">
        <div className="bot-msg welcome-bubble">{text}</div>
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

  const cappedOptions = options.slice(0, 4);
  const alreadyHasSomethingElse = cappedOptions.some(o => SOMETHING_ELSE_VARIANTS.test(o));

  return (
    <>
      {/* If there was no body text, render the question as a separate bubble first */}
      {skipBody && questionText && (
        <div className="bot-msg-container">
          <BotAvatar />
          <div className="bot-messages-group">
            <div className="bot-msg bot-question-bubble">{questionText}</div>
          </div>
        </div>
      )}
      <div className="bot-option-buttons" data-msg-id={msgId} data-question={questionText ?? ''}>
        {cappedOptions.map((label, idx) => {
          const isSomethingElse = SOMETHING_ELSE_VARIANTS.test(label);
          if (isSomethingElse) {
            return (
              <button
                key={idx}
                className="bot-option-btn bot-option-something-else"
                disabled={disabled || selectedIdx !== null}
                onClick={onFocusInput}
              >
                <span className="bot-option-pencil">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </span>
                <span className="bot-option-label">{label}</span>
              </button>
            );
          }
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
        {/* Auto-add "Something else" button if none of the options already covers it */}
        {!alreadyHasSomethingElse && (
          <button
            className="bot-option-btn bot-option-something-else"
            disabled={disabled || selectedIdx !== null}
            onClick={onFocusInput}
          >
            <span className="bot-option-pencil">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
            <span className="bot-option-label">{uiStr('somethingElse', selectedLanguage)}</span>
          </button>
        )}
      </div>
    </>
  );
}

// ── ChatBody ──────────────────────────────────────────────────────────────────
// Scrollable message list + thinking bubble + scroll-to-latest pill.

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

  // Show/hide the floating "Latest" pill based on scroll position.
  // Appears when the user is more than 80px above the bottom; hides when at bottom.
  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 80);
  };

  // Auto-scroll when new messages are added or thinking state changes
  useEffect(() => {
    autoScroll();
  }, [messages.length, isThinking]);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Collect all msgIds currently rendered, for sibling lookup in checkListForButtons
  const allMsgIds = messages
    .filter(m => m.msgId)
    .map(m => m.msgId as string);

  // Group welcome messages by their order so we can mark the first one for avatar
  // (welcome messages are added with role='welcome' and a shared group key)
  const welcomeGroupSeen = new Set<string>();

  return (
    <div id="chat-widget-body" ref={bodyRef} onScroll={handleScroll}>
      {messages.map((msg, idx) => {
        if (msg.role === 'user') {
          return <UserMessage key={msg.id} text={msg.text} />;
        }

        if (msg.role === 'welcome') {
          // Welcome messages share a groupId stored in msgId
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
              onAutoScroll={autoScroll}
              onDetectedButtons={(options, questionText) => {
                onAddOptionButtons(options, questionText, msg.msgId ?? msg.id);
              }}
              allMsgIds={allMsgIds}
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
              disabled={isRequestInProgress}
              onSelect={onSendOptionMessage}
              onFocusInput={focusInput}
            />
          );
        }

        return null;
      })}

      {/* Thinking indicator — shown while waiting for server response */}
      {isThinking && <ThinkingBubble thinkingText={thinkingText} />}

      {/* Floating "Latest" pill — appears when user has scrolled up */}
      <button
        id="scroll-to-bottom-header"
        className="scroll-to-latest-btn"
        style={{ display: showScrollBtn ? 'inline-flex' : 'none' }}
        onClick={autoScroll}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span id="scroll-latest-label">{uiStr('scrollLatest', selectedLanguage)}</span>
      </button>
    </div>
  );
}
