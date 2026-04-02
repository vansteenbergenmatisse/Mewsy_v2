import React, { useState, useRef, useCallback } from 'react';
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
  getThinkingMessages,
  uiStr,
} from './config/chat-config';
import { BACKEND_URL, getSessionId } from './utils/session';

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

  // ── Help panels ────────────────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpDetail, setShowHelpDetail] = useState(false);
  const [helpDetailTopic, setHelpDetailTopic] = useState<string | null>(null);

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

  function addBotMessage(text: string, messageId: string) {
    const detected = detectOptionButtons(text);
    let detectedOptions: string[] | null = null;
    let detectedQuestion: string | null = null;
    let skipBodyMessages = false;
    let bodyText = text;

    if (detected) {
      detectedOptions = detected.options;
      detectedQuestion = detected.questionText ?? null;
      bodyText = '';
      skipBodyMessages = true;
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

    addUserMessage(trimmed);
    setInputValue('');
    setAttachedFiles([]);
    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(trimmed);
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
    setHeroActive(false);
    addUserMessage(label);
    setInputValue('');
    setInputPlaceholder(uiStr('typeMsg', selectedLanguage));
    setIsRequestInProgress(true);
    showThinking(selectedLanguage);
    sendToServer(contextMessage);
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
        onAttachFile={handleAttachFile}
        onRemoveFile={handleRemoveFile}
      />
    </>
  );
}
