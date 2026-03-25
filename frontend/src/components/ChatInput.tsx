import React, { useRef, useEffect } from 'react';
import { uiStr } from '../config/chat-config';

// ── ChatInput ──────────────────────────────────────────────────────────────────
// Footer textarea + toolbar (help trigger, voice placeholder, send button).

interface ChatInputProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  selectedLanguage: string | null;
  onChange: (value: string) => void;
  onSend: () => void;
  onOpenHelp: () => void;
}

export function ChatInput({
  value,
  placeholder,
  disabled,
  selectedLanguage,
  onChange,
  onSend,
  onOpenHelp,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows (matches original behaviour)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim().length > 0) {
        onSend();
      }
    }
  };

  const sendDisabled = disabled || value.trim().length === 0;

  return (
    <div id="chat-widget-footer">
      <div className="input-inner">
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={1}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="input-toolbar">
          <button
            id="help-trigger-btn"
            className="input-help-btn"
            type="button"
            aria-label="Help"
            title="Help &amp; Resources"
            onClick={onOpenHelp}
          >?</button>
          <div className="input-toolbar-spacer"></div>
          {/* Voice button — visual placeholder only, not wired to speech API */}
          <button className="input-voice-btn" type="button" aria-label="Voice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button
            id="send-button"
            type="button"
            aria-label="Send"
            disabled={sendDisabled}
            onClick={onSend}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
