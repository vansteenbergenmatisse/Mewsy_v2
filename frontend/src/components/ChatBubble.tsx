import React from 'react';

// ── ChatBubble ─────────────────────────────────────────────────────────────────
// The floating pill button shown when the widget is hidden.
// Also renders the unread badge that sits outside the widget.

interface ChatBubbleProps {
  unreadCount: number;
  onClick: () => void;
}

export function ChatBubble({ unreadCount, onClick }: ChatBubbleProps) {
  return (
    <>
      {/* Unread badge — lives outside the widget so it shows when widget is closed */}
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
