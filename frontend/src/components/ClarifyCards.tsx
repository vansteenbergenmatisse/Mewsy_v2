import React, { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ClarifyQuestion {
  text: string;
  options: string[];
}

interface ClarifyCardsProps {
  questions: ClarifyQuestion[];
  msgId: string;
  disabled: boolean;
  // Called once all questions are answered or skipped.
  // Receives the full Q&A batch as a single formatted string for the backend.
  onComplete: (answers: string, summary: { q: string; a: string }[]) => void;
}

// ── ClarifyCards ───────────────────────────────────────────────────────────────
// Renders a card carousel: one question at a time, "N of M" counter top-right.
// Selecting an option immediately advances to the next card — no API call between cards.
// After the last card, calls onComplete with all answers formatted for the backend.

export function ClarifyCards({ questions, msgId, disabled, onComplete }: ClarifyCardsProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const [done, setDone] = useState(false);
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [freeText, setFreeText] = useState('');

  if (questions.length === 0 || done) return null;

  const current = questions[currentIdx];
  const total = questions.length;

  function submit(answer: string) {
    const newAnswers = [...answers, { q: current.text, a: answer }];
    setAnswers(newAnswers);
    setFreeTextMode(false);
    setFreeText('');

    if (currentIdx < total - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setDone(true);
      // Format all Q&A pairs for the backend parser (parseClarifyAnswers in agent.ts)
      const formatted = newAnswers.map(pair => `Q: ${pair.q}\nA: ${pair.a}`).join('\n');
      onComplete(formatted, newAnswers);
    }
  }

  function skip() {
    submit('(skipped)');
  }

  const pencilIcon = (
    <span className="bot-option-pencil">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </span>
  );

  const { main: mainOptions, somethingElse: somethingElseLabel } = splitOptions(current.options);

  return (
    <div className="clarify-card-container" data-msg-id={msgId}>
      {/* Card header */}
      <div className="clarify-card-header">
        <span className="clarify-card-question">{current.text}</span>
        <div className="clarify-card-nav">
          <span className="clarify-card-counter">{currentIdx + 1} of {total}</span>
          <button
            className="clarify-card-skip"
            onClick={skip}
            disabled={disabled}
          >
            Skip
          </button>
          <button
            className="clarify-card-close"
            onClick={() => setDone(true)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>

      {/* Option buttons */}
      <div className="clarify-card-options">
        {mainOptions.map((label, idx) => (
          <button
            key={idx}
            className="bot-option-btn clarify-option-btn"
            disabled={disabled}
            onClick={() => submit(label)}
          >
            <span className="bot-option-number">{idx + 1}</span>
            <span className="bot-option-label">{label}</span>
            <svg className="bot-option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}

        {/* Something else — opens inline text input instead of submitting literal string */}
        {!freeTextMode ? (
          <button
            className="bot-option-btn bot-option-something-else clarify-option-btn"
            disabled={disabled}
            onClick={() => { setFreeTextMode(true); setFreeText(''); }}
          >
            {pencilIcon}
            <span className="bot-option-label">{somethingElseLabel ?? 'Something else'}</span>
          </button>
        ) : (
          <div className="clarify-free-text">
            <input
              autoFocus
              type="text"
              className="clarify-free-text-input"
              value={freeText}
              placeholder="Type your answer…"
              onChange={e => setFreeText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && freeText.trim()) {
                  submit(freeText.trim());
                } else if (e.key === 'Escape') {
                  setFreeTextMode(false);
                }
              }}
            />
            <button
              className="clarify-free-text-submit"
              disabled={!freeText.trim()}
              onClick={() => { if (freeText.trim()) submit(freeText.trim()); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SOMETHING_ELSE_RE = /\b(something else|other|etwas anderes|autre chose|iets anders|anders)\b/i;

function splitOptions(options: string[]): { main: string[]; somethingElse: string | null } {
  const main = options.filter(o => !SOMETHING_ELSE_RE.test(o)).slice(0, 4);
  const somethingElse = options.find(o => SOMETHING_ELSE_RE.test(o)) ?? null;
  return { main, somethingElse };
}
