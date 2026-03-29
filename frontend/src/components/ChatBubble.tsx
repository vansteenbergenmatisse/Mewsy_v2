import React from 'react';

// ── ChatBubble ─────────────────────────────────────────────────────────────────
// Floating pill button shown when the widget is hidden.

interface ChatBubbleProps {
  unreadCount: number;
  onClick: () => void;
}

export function ChatBubble({ unreadCount, onClick }: ChatBubbleProps) {
  return (
    <>
      {unreadCount > 0 && (
        <span id="chat-unread-badge" style={{ display: 'flex' }}>
          {unreadCount}
        </span>
      )}
      <button id="mewsy-bubble" aria-label="Open Mewsy" onClick={onClick}>
        Problem? Ask Mewsy
      </button>
    </>
  );
}
