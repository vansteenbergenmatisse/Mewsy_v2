import React, { useRef, useEffect, forwardRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttachedFile {
  id: string;
  name: string;
}

interface ChatInputProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  selectedLanguage: string | null;
  attachedFiles: AttachedFile[];
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
}

// ── ChatInput ──────────────────────────────────────────────────────────────────

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    { value, placeholder, disabled, attachedFiles, onChange, onSend, onAttachFile, onRemoveFile },
    ref
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea as content grows
    useEffect(() => {
      const ta = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
      if (!ta) return;
      ta.style.height = '1px';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }, [value, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim().length > 0) {
          onSend();
        }
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach(f => onAttachFile(f));
      e.target.value = '';
    };

    const sendDisabled = disabled || value.trim().length === 0;

    return (
      <div id="chat-widget-footer">

        {/* File chips */}
        {attachedFiles.length > 0 && (
          <div className="file-chips">
            {attachedFiles.map(f => (
              <div key={f.id} className="file-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                <span className="file-chip-name">{f.name}</span>
                <button
                  className="file-chip-remove"
                  onClick={() => onRemoveFile(f.id)}
                  aria-label={`Remove ${f.name}`}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Input box: [textarea] / [attach ... mic send] */}
        <div className="input-box">

          {/* Textarea */}
          <textarea
            id="chat-input"
            ref={ref}
            rows={1}
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Footer row: attach left, mic+send right */}
          <div className="input-box-footer">
            <button
              className="input-attach-btn"
              type="button"
              aria-label="Attach file"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            <div className="input-toolbar">
              <button
                className="input-voice-btn"
                type="button"
                aria-label="Voice input"
                title="Voice input — coming soon"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>

        </div>

      </div>
    );
  }
);
