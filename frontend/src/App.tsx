import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatBubble } from './components/ChatBubble';
import { ChatWidget } from './components/ChatWidget';
import { ChatMessage } from './components/ChatBody';
import {
  detectOptionButtons,
  stripButtonSyntax,
  splitResponseIntoMessages,
  registerCopyHandler,
} from './utils/chat-utils';
import {
  LANGUAGES,
  getThinkingMessages,
  uiStr,
} from './config/chat-config';
import { BACKEND_URL, getSessionId, getBrowserToken, getBaseUserId, getBaseContext } from './utils/session';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WidgetMode = 'hidden' | 'fullscreen' | 'side-panel';

export interface AttachedFile {
  id: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMobile(): boolean {
  return window.innerWidth <= 768;
}

function makeId(): string {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function makeMsgId(): string {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Widget mode ────────────────────────────────────────────────────────────
  const [widgetMode, setWidgetMode] = useState<WidgetMode>('fullscreen');

  // ── Hero state — true until first user message ──────────────────────────
  const [heroActive, setHeroActive] = useState(true);
  const [heroExiting, setHeroExiting] = useState(false);

  // ── Messages ───────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // ── Request / thinking state ───────────────────────────────────────────────
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const thinkingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingStartTimeRef = useRef<number | null>(null);
  const thinkingIndexRef = useRef(0);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const THINKING_TIMEOUT = 30_000;
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Language ───────────────────────────────────────────────────────────────
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    () => sessionStorage.getItem('Mewsie_lang') || null
  );
  const isFirstMessageRef = useRef(!sessionStorage.getItem('Mewsie_lang'));
  const langChangedRef = useRef(false);

  // ── Input ──────────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [inputPlaceholder, setInputPlaceholder] = useState(
    () => uiStr('askMewsie', sessionStorage.getItem('Mewsie_lang') || null)
  );

  // ── Attached files ─────────────────────────────────────────────────────────
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // ── Unread badge ───────────────────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Pending clarify question (set when [BUTTONS:] is shown, cleared on any send) ──
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  // ── Help panels ────────────────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpDetail, setShowHelpDetail] = useState(false);
  const [helpDetailTopic, setHelpDetailTopic] = useState<string | null>(null);

  // ── Register delegated copy-button handler once on mount ─────────────────
  useEffect(() => { registerCopyHandler(); }, []);

  // ── Base context sync (iframe embed) ────────────────────────────────────────
  // When Mewsie is loaded inside an iframe by mewsie-loader.js, the URL
  // carries context params (?baseUserId=...&as=...&tier=...&company=...).
  // On mount, read them and call /api/sync-context to create/update the user.
  useEffect(() => {
    const ctx = getBaseContext();
    if (!ctx.baseUserId) return; // Not an iframe embed — skip
    fetch('/api/sync-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUserId: ctx.baseUserId,
        accountingSoftware: ctx.accountingSoftware,
        tier: ctx.tier,
        companyName: ctx.companyName,
      }),
    }).catch(() => { /* best-effort — identity linking in resolveIdentity is the fallback */ });
  }, []);

  // ── Thinking indicator ─────────────────────────────────────────────────────

  const showThinking = useCallback((lang: string | null) => {
    const msgs = getThinkingMessages(lang);
    setThinkingText(msgs[0]);
    setIsThinking(true);
    thinkingStartTimeRef.current = Date.now();
    thinkingIndexRef.current = 0;

    thinkingIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (thinkingStartTimeRef.current ?? 0);
      if (elapsed >= THINKING_TIMEOUT) {
        clearInterval(thinkingIntervalRef.current!);
        abortControllerRef.current?.abort(); // cancel the in-flight fetch
        removeThinking();
        showTimeoutWarning();
        setIsRequestInProgress(false);
        return;
      }
      const currentMsgs = getThinkingMessages(lang);
      if (thinkingIndexRef.current < currentMsgs.length - 1) {
        thinkingIndexRef.current++;
      }
      setThinkingText(currentMsgs[thinkingIndexRef.current]);
    }, 5000);

    requestTimeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort(); // cancel the in-flight fetch
      removeThinking();
      showTimeoutWarning();
      setIsRequestInProgress(false);
    }, THINKING_TIMEOUT);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const removeThinking = useCallback(() => {
    setIsThinking(false);
    setThinkingText('');
    if (thinkingIntervalRef.current) {
      clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    thinkingIndexRef.current = 0;
    thinkingStartTimeRef.current = null;
  }, []);

  function showTimeoutWarning() {
    const el = document.getElementById('timeout-warning');
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
  }

  // ── Message rendering ──────────────────────────────────────────────────────

  function addUserMessage(text: string) {
    setMessages(prev => [
      ...prev,
      { id: makeId(), role: 'user', text },
    ]);
  }

  function addBotMessage(text: string, messageId: string, bundleId?: string) {
    const detected = detectOptionButtons(text);
    let detectedOptions: string[] | null = null;
    let detectedQuestion: string | null = null;
    let skipBodyMessages = false;
    let bodyText = text;

    if (detected) {
      detectedOptions = detected.options;
      detectedQuestion = detected.questionText ?? null;
      bodyText = detected.bodyText ?? '';
      skipBodyMessages = !bodyText;
    } else {
      bodyText = stripButtonSyntax(text);
    }

    const messagesToShow = skipBodyMessages ? [] : splitResponseIntoMessages(bodyText);
    const delay = 800;

    messagesToShow.forEach((msg, idx) => {
      setTimeout(() => {
        setMessages(prev => {
          const existingGroupBubbles = prev.filter(
            m => m.msgId === messageId && m.role === 'bot'
          );
          const isNewGroup = existingGroupBubbles.length === 0;
          return [
            ...prev,
            {
              id: makeId(),
              role: 'bot',
              text: msg,
              msgId: messageId,
              isNewGroup,
              clarifying: !!detected,
              bundleId,
            } as ChatMessage,
          ];
        });

        if (widgetMode === 'hidden') {
          setUnreadCount(c => c + 1);
        }
      }, idx * delay);
    });

    setTimeout(() => {
      if (detectedOptions && detectedOptions.length > 0) {
        addOptionButtons(detectedOptions, detectedQuestion, messageId, skipBodyMessages);
      }
    }, messagesToShow.length * delay);
  }

  function addOptionButtons(
    options: string[],
    questionText: string | null,
    msgId: string,
    skipBody: boolean
  ) {
    setMessages(prev => [
      ...prev,
      {
        id: makeId(),
        role: 'option-buttons',
        text: '',
        msgId,
        options,
        questionText,
        skipBody,
      } as ChatMessage,
    ]);
    setInputPlaceholder(uiStr('typeOwn', selectedLanguage));
    if (questionText) setPendingQuestion(questionText);
  }

  const handleAddOptionButtons = useCallback((
    options: string[],
    questionText: string | null,
    msgId: string
  ) => {
    addOptionButtons(options, questionText, msgId, true);
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Server communication ───────────────────────────────────────────────────

  const sendToServer = useCallback((message: string) => {
    // Reset the legacy refs — they no longer control what gets sent, but
    // other parts of the component still read them (placeholder sync).
    isFirstMessageRef.current = false;
    langChangedRef.current = false;

    // Abort any previous in-flight request before starting a new one
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      // language is the single authoritative signal. Sent on every request,
      // stored in session.context.language, and surfaced to Sonnet via the
      // LANGUAGE LOCK block in buildSystemPrompt(). We no longer prepend an
      // inline [System note:] directive to the user message — that pattern
      // was a hack from before the language field existed and it leaked
      // stale language directives into the stored conversation history.
      body: JSON.stringify({
        chatInput: message,
        sessionId: getSessionId(),
        language: selectedLanguage,
        browserToken: getBrowserToken(),
        baseUserId: getBaseUserId(),
      }),
    })
      .then(r => r.json())
      .then(data => {
        removeThinking();
        setIsRequestInProgress(false);
        const reply = data.output || "I didn't catch that - could you rephrase?";
        const responseBundleId: string | undefined = data.bundleId;
        const hasTicketOffer: boolean = data.ticketOffer === true;

        // Detect clarify_questions JSON from the backend
        try {
          const parsed = JSON.parse(reply) as { __type?: string; questions?: { text: string; options: string[] }[] };
          if (parsed.__type === 'clarify_questions' && Array.isArray(parsed.questions)) {
            const id = makeMsgId();
            setMessages(prev => [
              ...prev,
              {
                id: makeId(),
                role: 'clarify-cards' as const,
                text: '',
                msgId: id,
                clarifyQuestions: parsed.questions,
              },
            ]);
            return;
          }
        } catch {
          // Not JSON — fall through to regular message handling
        }

        const id = makeMsgId();
        addBotMessage(reply, id, responseBundleId);

        if (hasTicketOffer) {
          setTimeout(() => {
            setMessages(prev => [
              ...prev,
              { id: makeId(), role: 'ticket-offer' as const, text: '', ticketState: 'idle' as const },
            ]);
          }, 2000);
        }
      })
      .catch((err) => {
        // If the request was aborted (by timeout or new request), don't show error
        if (err instanceof DOMException && err.name === 'AbortError') return;
        removeThinking();
        setIsRequestInProgress(false);
        addBotMessage('Sorry, something went wrong while contacting the server. Please Try Again Later.', makeMsgId());
      });
  }, [selectedLanguage, removeThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core send logic ────────────────────────────────────────────────────────

  const handleSendMessage = useCallback((msg: string) => {
    if (isRequestInProgress) return;
    const trimmed = msg.trim();
    if (!trimmed) return;

    // Dismiss hero — animate out first if in fullscreen hero
    if (widgetMode === 'fullscreen' && heroActive) {
      setHeroExiting(true);
      setTimeout(() => {
        setHeroActive(false);
        setHeroExiting(false);
      }, 320);
    } else {
      setHeroActive(false);
    }

    // Disable previous option buttons
    setMessages(prev =>
      prev.map(m => m.role === 'option-buttons' ? { ...m, disabled: true } : m)
    );

    // If a [BUTTONS:] question is pending, treat the typed text as the answer
    const contextToSend = pendingQuestion ? `${pendingQuestion} → ${trimmed}` : trimmed;
    setPendingQuestion(null);

    addUserMessage(trimmed);
    setInputValue('');
    setAttachedFiles([]);
    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(contextToSend);
  }, [isRequestInProgress, selectedLanguage, showThinking, sendToServer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(() => {
    handleSendMessage(inputValue);
  }, [inputValue, handleSendMessage]);

  // ── Quick action buttons (hero) ────────────────────────────────────────────

  const handleQuickAction = useCallback((label: string) => {
    handleSendMessage(label);
  }, [handleSendMessage]);

  // ── Option button click ────────────────────────────────────────────────────

  const handleSendOptionMessage = useCallback((label: string, question: string | null) => {
    const contextMessage = question ? `${question} → ${label}` : label;
    setPendingQuestion(null);
    setHeroActive(false);
    const NEUTRAL_PREFIXES = [
      "I'd like to continue with",
      "Let's go ahead with",
      "I'd like to go with",
    ];
    const prefix = NEUTRAL_PREFIXES[label.length % NEUTRAL_PREFIXES.length];
    const displayMessage = label.split(/\s+/).length <= 6
      ? `${prefix} ${label}`
      : label;
    addUserMessage(displayMessage);
    setInputValue('');
    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(contextMessage);
  }, [selectedLanguage, showThinking, sendToServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Salesforce ticket creation ─────────────────────────────────────────────

  const handleCreateTicket = useCallback(async (msgId: string) => {
    type TicketState = ChatMessage['ticketState'];
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, ticketState: 'creating' as TicketState } : m));
    try {
      const resp = await fetch(`${BACKEND_URL}/api/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
      const data = await resp.json() as { ok: boolean; ticketId?: string; message?: string };
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        ticketState: (data.ok ? 'done' : 'error') as TicketState,
        ticketMessage: data.ok
          ? (data.ticketId ? `Ticket #${data.ticketId} created — our team will follow up shortly.` : 'Ticket created — our team will follow up shortly.')
          : (data.message ?? 'Our team has been notified — expect a reply within 1 business day.'),
      } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        ticketState: 'error' as TicketState,
        ticketMessage: 'Our team has been notified — expect a reply within 1 business day.',
      } : m));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clarify card completion ────────────────────────────────────────────────
  // Called when the user has answered (or skipped) all clarifying questions.
  // Shows the Q&A summary as a user bubble, then sends the formatted string to the backend.

  const handleSendClarifyAnswers = useCallback((formatted: string, summary: { q: string; a: string }[]) => {
    // Disable all clarify-card messages
    setMessages(prev => prev.map(m => m.role === 'clarify-cards' ? { ...m, disabled: true } : m));

    // Show a compact user bubble with the Q&A summary
    const summaryText = summary
      .filter(p => p.a !== '(skipped)')
      .map(p => `${p.q} → ${p.a}`)
      .join('\n');
    if (summaryText) {
      setMessages(prev => [...prev, { id: makeId(), role: 'user', text: summaryText }]);
    }

    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(formatted);
  }, [selectedLanguage, showThinking, sendToServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Language change ────────────────────────────────────────────────────────

  const handleLanguageChange = useCallback((code: string) => {
    const prev = selectedLanguage;
    setSelectedLanguage(code);
    sessionStorage.setItem('Mewsie_lang', code);
    if (prev && prev !== code) {
      langChangedRef.current = true;
    }
    if (!prev) {
      isFirstMessageRef.current = true;
    }
    // Keep the input placeholder in sync when language changes before first message
    if (heroActive) {
      setInputPlaceholder(uiStr('askMewsie', code));
    }
  }, [selectedLanguage, heroActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File management ────────────────────────────────────────────────────────

  const handleAttachFile = useCallback((file: File) => {
    setAttachedFiles(prev => [...prev, { id: makeId(), name: file.name }]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── New chat ───────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setHeroActive(true);
    setInputValue('');
    setPendingQuestion(null);
    setInputPlaceholder(uiStr('askMewsie', selectedLanguage));
    setAttachedFiles([]);
    setIsRequestInProgress(false);
    removeThinking();
  }, [removeThinking]);

  // ── Sidebar collapsed state (fullscreen only) ──────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(c => !c);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  // ── Layout toggle ──────────────────────────────────────────────────────────

  const handleToggleLayout = useCallback(() => {
    setWidgetMode(m => {
      if (m === 'fullscreen') {
        setSidebarCollapsed(true);   // collapse when entering side-panel
        return 'side-panel';
      } else {
        setSidebarCollapsed(false);  // re-expand when returning to fullscreen
        return 'fullscreen';
      }
    });
  }, []);

  // ── Bubble click ───────────────────────────────────────────────────────────

  const handleBubbleClick = () => {
    setUnreadCount(0);
    setWidgetMode('side-panel');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {widgetMode === 'hidden' && (
        <ChatBubble unreadCount={unreadCount} onClick={handleBubbleClick} />
      )}

      <ChatWidget
        widgetMode={widgetMode}
        sidebarCollapsed={sidebarCollapsed}
        heroActive={heroActive}
        heroExiting={heroExiting}
        messages={messages}
        isThinking={isThinking}
        thinkingText={thinkingText}
        selectedLanguage={selectedLanguage}
        isRequestInProgress={isRequestInProgress}
        inputValue={inputValue}
        inputPlaceholder={inputPlaceholder}
        attachedFiles={attachedFiles}
        showHelp={showHelp}
        showHelpDetail={showHelpDetail}
        helpDetailTopic={helpDetailTopic}
        onClose={() => setWidgetMode('hidden')}
        onToggleSidebar={handleToggleSidebar}
        onCloseSidebar={handleCloseSidebar}
        onToggleLayout={handleToggleLayout}
        onNewChat={handleNewChat}
        onOpenHelp={() => setShowHelp(true)}
        onCloseHelp={() => setShowHelp(false)}
        onSelectHelpTopic={(topic) => {
          setHelpDetailTopic(topic);
          setShowHelpDetail(true);
          fetch('/api/help-open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: getSessionId(), topic }),
          }).catch(() => {});
        }}
        onCloseHelpDetail={() => setShowHelpDetail(false)}
        onCloseAllHelp={() => {
          setShowHelp(false);
          setShowHelpDetail(false);
        }}
        onAskMewsie={(message: string) => {
          setShowHelp(false);
          setShowHelpDetail(false);
          handleSendMessage(message);
        }}
        onLanguageChange={handleLanguageChange}
        onInputChange={setInputValue}
        onSend={handleSend}
        onQuickAction={handleQuickAction}
        onSendOptionMessage={handleSendOptionMessage}
        onAddOptionButtons={handleAddOptionButtons}
        onSendClarifyAnswers={handleSendClarifyAnswers}
        onCreateTicket={handleCreateTicket}
        onAttachFile={handleAttachFile}
        onRemoveFile={handleRemoveFile}
      />
    </>
  );
}
