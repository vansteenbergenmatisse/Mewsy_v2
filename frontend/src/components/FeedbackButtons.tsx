import React, { useState } from 'react';

interface FeedbackButtonsProps {
  bundleId: string;
}

const NOT_HELPFUL_REASONS = [
  { id: 'incomplete', label: 'Incomplete answer' },
  { id: 'not_solved', label: "Didn't solve my problem" },
  { id: 'irrelevant', label: 'Irrelevant answer' },
  { id: 'not_found', label: 'Info not found' },
  { id: 'other', label: 'Other' },
];

export function FeedbackButtons({ bundleId }: FeedbackButtonsProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function sendFeedback(v: 'up' | 'down', r?: string) {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, vote: v, reason: r || undefined }),
      });
    } catch {
      // Swallow — feedback is best-effort
    }
  }

  function handleThumbsUp() {
    if (submitted) return;
    setVote('up');
    setSubmitted(true);
    sendFeedback('up');
  }

  function handleThumbsDown() {
    if (submitted) return;
    setVote('down');
    // Don't submit yet — wait for reason selection
  }

  function handleReason(reasonId: string) {
    setReason(reasonId);
    setSubmitted(true);
    sendFeedback('down', reasonId);
  }

  if (submitted) {
    return (
      <div className="feedback-buttons feedback-submitted">
        <span className="feedback-thanks">
          {vote === 'up' ? 'Thanks!' : 'Feedback sent'}
        </span>
      </div>
    );
  }

  return (
    <div className="feedback-buttons">
      <div className="feedback-thumbs">
        <button
          className={`feedback-btn feedback-up${vote === 'up' ? ' active' : ''}`}
          onClick={handleThumbsUp}
          title="Helpful"
          aria-label="Helpful"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        </button>
        <button
          className={`feedback-btn feedback-down${vote === 'down' ? ' active' : ''}`}
          onClick={handleThumbsDown}
          title="Not helpful"
          aria-label="Not helpful"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
          </svg>
        </button>
      </div>

      {vote === 'down' && !reason && (
        <div className="feedback-reasons">
          <span className="feedback-reasons-label">What went wrong?</span>
          <div className="feedback-reasons-chips">
            {NOT_HELPFUL_REASONS.map(r => (
              <button
                key={r.id}
                className="feedback-reason-chip"
                onClick={() => handleReason(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
