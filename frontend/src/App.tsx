import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatBubble } from './components/ChatBubble';
import { ChatWidget } from './components/ChatWidget';
import { ChatMessage } from './components/ChatBody';
import {
  detectOptionButtons,
  stripButtonSyntax,
  splitResponseIntoMessages,
} from './utils/chat-utils';
import {
  LANGUAGES,
  welcomeText,
  getThinkingMessages,
  uiStr,
} from './config/chat-config';
import { BACKEND_URL, getSessionId } from './utils/session';

// ── Types ─────────────────────────────────────────────────────────────────────

type WidgetMode = 'hidden' | 'quarter' | 'full';

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
  // 'hidden' | 'quarter' | 'full'
  const [widgetMode, setWidgetModeState] = useState<WidgetMode>('hidden');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Messages ───────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const hasShownWelcome = useRef(false);

  // ── Request / thinking state ───────────────────────────────────────────────
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const thinkingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingStartTimeRef = useRef<number | null>(null);
  const thinkingIndexRef = useRef(0);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const THINKING_TIMEOUT = 30_000;

  // ── Language ───────────────────────────────────────────────────────────────
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    () => sessionStorage.getItem('mewsy_lang') || null
  );
  // true on the very first message (before any language was set or confirmed)
  const isFirstMessageRef = useRef(!sessionStorage.getItem('mewsy_lang'));
  // true after a mid-conversation language switch
  const langChangedRef = useRef(false);

  // ── Input ──────────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [inputPlaceholder, setInputPlaceholder] = useState('Ask Mewsy...');
  const inputRefForFocus = useRef<HTMLTextAreaElement>(null);

  // ── Unread badge ───────────────────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  const originalTitle = useRef(document.title);

  // Update document title whenever unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) New message from Mewsy`;
    } else {
      document.title = originalTitle.current;
    }
  }, [unreadCount]);

  // ── Help panels ────────────────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpDetail, setShowHelpDetail] = useState(false);
  const [helpDetailTopic, setHelpDetailTopic] = useState<string | null>(null);

  // ── Widget mode management ─────────────────────────────────────────────────

  const setWidgetMode = useCallback((mode: WidgetMode) => {
    setWidgetModeState(mode);

    // Close sidebar when leaving full mode
    if (mode !== 'full') {
      setSidebarOpen(false);
    }

    if (mode !== 'hidden' && !hasShownWelcome.current) {
      showWelcomeMessages(selectedLanguage ?? 'en');
    }
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize listener: if quarter mode on mobile, switch to full
  useEffect(() => {
    const handleResize = () => {
      if (widgetMode === 'quarter' && isMobile()) {
        setWidgetMode('full');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [widgetMode, setWidgetMode]);

  // ── Welcome messages ───────────────────────────────────────────────────────

  function showWelcomeMessages(lang: string) {
    if (hasShownWelcome.current) return;
    hasShownWelcome.current = true;

    const effectiveLang = lang || 'en';
    if (!sessionStorage.getItem('mewsy_lang')) {
      sessionStorage.setItem('mewsy_lang', effectiveLang);
      setSelectedLanguage(effectiveLang);
    }

    showWelcomeInLanguage(effectiveLang);
  }

  function showWelcomeInLanguage(lang: string) {
    const base = lang.split('-')[0]; // de-ch → de
    const messages = welcomeText[lang] || welcomeText[base] || welcomeText['en'];
    const groupId = 'welcome_' + makeId();

    const currentDelay = 300;
    const typingDuration = 500;
    const messageDelay = 750;

    messages.forEach((messageText, idx) => {
      // Show typing dots, then replace with the actual text bubble
      setTimeout(() => {
        const typingId = makeId();
        // Typing indicator bubble
        setMessages(prev => [
          ...prev,
          {
            id: typingId,
            role: 'welcome',
            text: '__typing__',
            msgId: groupId,
            isNewGroup: idx === 0,
          } as ChatMessage,
        ]);

        setTimeout(() => {
          // Replace typing bubble with real text
          setMessages(prev =>
            prev.map(m =>
              m.id === typingId
                ? { ...m, text: messageText }
                : m
            )
          );
        }, typingDuration);
      }, currentDelay + idx * messageDelay);
    });
  }

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
      removeThinking();
      showTimeoutWarning();
      setIsRequestInProgress(false);
    }, THINKING_TIMEOUT);
  }, []);

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

  function addBotMessage(text: string, messageId: string) {
    const detected = detectOptionButtons(text);
    let detectedOptions: string[] | null = null;
    let detectedQuestion: string | null = null;
    let skipBodyMessages = false;
    let bodyText = text;

    if (detected) {
      detectedOptions = detected.options;
      detectedQuestion = detected.questionText ?? null;
      bodyText = detected.bodyText ?? '';
      skipBodyMessages = !detected.bodyText;
    } else {
      bodyText = stripButtonSyntax(text);
    }

    const messagesToShow = skipBodyMessages ? [] : splitResponseIntoMessages(bodyText);
    const delay = 800;

    messagesToShow.forEach((msg, idx) => {
      setTimeout(() => {
        setMessages(prev => {
          // Determine if this is the first bubble in a new group for the avatar
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
            } as ChatMessage,
          ];
        });

        if (widgetMode === 'hidden') {
          setUnreadCount(c => c + 1);
        }
      }, idx * delay);
    });

    // After all body bubbles, add option buttons if detected
    setTimeout(() => {
      if (detectedOptions && detectedOptions.length > 0) {
        addOptionButtons(detectedOptions, detectedQuestion, messageId, skipBodyMessages);
      }
      // Note: post-render list-to-buttons detection happens inside BotTextBubble
      // via onDetectedButtons callback → onAddOptionButtons
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
    // Change placeholder to indicate the user can also type their own answer
    setInputPlaceholder(uiStr('typeOwn', selectedLanguage));
  }

  // Called from BotTextBubble after post-render list detection
  const handleAddOptionButtons = useCallback((
    options: string[],
    questionText: string | null,
    msgId: string
  ) => {
    addOptionButtons(options, questionText, msgId, false);
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Server communication ───────────────────────────────────────────────────

  const sendToServer = useCallback((message: string) => {
    let chatInput = message;
    const langEntry = LANGUAGES.find(l => l.code === selectedLanguage);
    const langSystemName = langEntry ? langEntry.systemName : null;

    if (langSystemName && (isFirstMessageRef.current || langChangedRef.current)) {
      const verb = langChangedRef.current ? 'switched' : 'selected';
      chatInput = `[System note: the user has ${verb} their language to ${langSystemName}. For the remainder of this conversation, always respond in ${langSystemName}.]\n\n${message}`;
      isFirstMessageRef.current = false;
      langChangedRef.current = false;
    }

    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput, sessionId: getSessionId() }),
    })
      .then(r => r.json())
      .then(data => {
        removeThinking();
        setIsRequestInProgress(false);
        const reply = data.output || "I didn't catch that — could you rephrase?";
        const id = makeMsgId();
        addBotMessage(reply, id);
      })
      .catch(() => {
        removeThinking();
        setIsRequestInProgress(false);
        addBotMessage('Sorry, something went wrong while contacting the server.', makeMsgId());
      });
  }, [selectedLanguage, removeThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (isRequestInProgress) return;
    const msg = inputValue.trim();
    if (!msg) return;

    // Disable all previously rendered option buttons
    setMessages(prev =>
      prev.map(m =>
        m.role === 'option-buttons' ? { ...m, disabled: true } : m
      )
    );

    addUserMessage(msg);
    setInputValue('');
    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(msg);
  }, [isRequestInProgress, inputValue, selectedLanguage, showThinking, sendToServer]);

  // ── Option button click → send as if typed ─────────────────────────────────

  const handleSendOptionMessage = useCallback((label: string, question: string | null) => {
    const contextMessage = question ? `${question} → ${label}` : label;
    addUserMessage(label);
    setInputValue('');
    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(contextMessage);
  }, [selectedLanguage, showThinking, sendToServer]);

  // ── Language change ────────────────────────────────────────────────────────

  const handleLanguageChange = useCallback((code: string) => {
    const prev = selectedLanguage;
    setSelectedLanguage(code);
    sessionStorage.setItem('mewsy_lang', code);
    if (prev && prev !== code) {
      langChangedRef.current = true;
    }
    if (!prev) {
      isFirstMessageRef.current = true;
      if (hasShownWelcome.current) {
        showWelcomeInLanguage(code);
      }
    }
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bubble click ───────────────────────────────────────────────────────────

  const handleBubbleClick = () => {
    setUnreadCount(0);
    setWidgetMode(isMobile() ? 'full' : 'quarter');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating bubble shown when widget is hidden */}
      {widgetMode === 'hidden' && (
        <ChatBubble unreadCount={unreadCount} onClick={handleBubbleClick} />
      )}

      {/* Main widget panel */}
      <ChatWidget
        widgetMode={widgetMode}
        messages={messages}
        isThinking={isThinking}
        thinkingText={thinkingText}
        selectedLanguage={selectedLanguage}
        isRequestInProgress={isRequestInProgress}
        inputValue={inputValue}
        inputPlaceholder={inputPlaceholder}
        showHelp={showHelp}
        showHelpDetail={showHelpDetail}
        helpDetailTopic={helpDetailTopic}
        sidebarOpen={sidebarOpen}
        onClose={() => setWidgetMode('hidden')}
        onExpand={() => setWidgetMode('full')}
        onCompress={() => setWidgetMode('quarter')}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onOpenHelp={() => setShowHelp(true)}
        onCloseHelp={() => setShowHelp(false)}
        onSelectHelpTopic={(topic) => {
          setHelpDetailTopic(topic);
          setShowHelpDetail(true);
        }}
        onCloseHelpDetail={() => setShowHelpDetail(false)}
        onCloseAllHelp={() => {
          setShowHelp(false);
          setShowHelpDetail(false);
        }}
        onLanguageChange={handleLanguageChange}
        onInputChange={setInputValue}
        onSend={handleSend}
        onSendOptionMessage={handleSendOptionMessage}
        onAddOptionButtons={handleAddOptionButtons}
      />
    </>
  );
}
