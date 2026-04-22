import React, { useRef, useEffect, forwardRef, useState, useCallback } from 'react';
import { SPEECH_LOCALE_MAP } from '../config/chat-config';

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
  /** When true, renders without the footer wrapper (for hero/fullscreen embed) */
  hero?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
}

type InputMode = 'search' | 'think' | 'canvas' | null;

// ── Speech Recognition types (Web Speech API) ────────────────────────────────

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

// ── Fallback bar heights (used when mic access is denied) ────────────────────

const FALLBACK_HEIGHTS_24 = [68,42,85,31,74,55,90,38,62,80,45,72,35,88,50,65,78,40,58,82,47,70,53,76];
const FALLBACK_HEIGHTS_32 = [68,42,85,31,74,55,90,38,62,80,45,72,35,88,50,65,78,40,58,82,47,70,53,76,60,44,83,36,69,57,87,41];

// ── ChatInput ──────────────────────────────────────────────────────────────────

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    { value, placeholder, disabled, selectedLanguage, attachedFiles, hero, onChange, onSend, onAttachFile, onRemoveFile },
    ref
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const [activeMode, setActiveMode] = useState<InputMode>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Audio-reactive visualizer
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const peakRef = useRef<number[]>([]);
    const numBars = hero ? 32 : 24;
    const [barData, setBarData] = useState<number[]>(new Array(numBars).fill(5));
    const [useAnimFallback, setUseAnimFallback] = useState(false);

    // Transcribing indicator — true while we wait for speech recognition result
    const [isTranscribing, setIsTranscribing] = useState(false);
    // Live interim transcript preview (shown while speaking, before finalized)
    const [interimText, setInterimText] = useState('');
    // Ref to track committed text so interim handler can read current value
    const committedTextRef = useRef('');

    const maxHeight = hero ? 200 : 120;

    // Auto-resize textarea
    useEffect(() => {
      const ta = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
      if (!ta || isRecording) return;
      ta.style.height = '1px';
      ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px';
    }, [value, ref, maxHeight, isRecording]);

    // Recording timer
    useEffect(() => {
      if (isRecording) {
        timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordingTime(0);
      }
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isRecording]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        recognitionRef.current?.abort();
        stopAudioVisualizer();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim().length > 0) {
          onSend();
        }
      }
    }, [disabled, value, onSend]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach(f => onAttachFile(f));
      e.target.value = '';
    };

    const toggleMode = (mode: InputMode) => {
      setActiveMode(prev => prev === mode ? null : mode);
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ── Audio visualizer (real mic data) ─────────────────────────────────────

    const initAudioVisualizer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.6;
        analyser.minDecibels = -80;
        analyser.maxDecibels = -20;
        source.connect(analyser);
        analyserRef.current = analyser;

        setUseAnimFallback(false);
        if (peakRef.current.length !== numBars) {
          peakRef.current = new Array(numBars).fill(5);
        }

        const updateBars = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const peaks = peakRef.current;
          const bars = Array.from({ length: numBars }, (_, i) => {
            // Map bar index to frequency bin — spread across usable range
            const idx = Math.min(
              data.length - 1,
              Math.floor((i / numBars) * Math.min(data.length, 48))
            );
            // Amplify: square-root curve so quiet speech is still visible
            const raw = data[idx] / 255;
            const amplified = Math.pow(raw, 0.5) * 100;
            const live = Math.max(4, amplified);
            // Peak hold: rise instantly, decay slowly (0.8% per frame ≈ fades over ~1.5s)
            peaks[i] = live > peaks[i] ? live : Math.max(4, peaks[i] * 0.985);
            return peaks[i];
          });
          setBarData(bars);
          animFrameRef.current = requestAnimationFrame(updateBars);
        };
        updateBars();
      } catch {
        // getUserMedia denied or unavailable — fall back to CSS animation
        setUseAnimFallback(true);
      }
    };

    const stopAudioVisualizer = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      setBarData(new Array(numBars).fill(5));
      setUseAnimFallback(false);
    };

    // ── Recording controls ───────────────────────────────────────────────────

    const startRecording = async () => {
      setIsRecording(true);
      setIsTranscribing(true);
      setInterimText('');
      committedTextRef.current = value;

      // Start audio visualizer FIRST — grabs the mic stream before speech recognition
      // to avoid dual-access conflicts on some browsers
      await initAudioVisualizer();

      // Start speech recognition (if available)
      const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
                 (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      if (SR) {
        try {
          const recognition = new (SR as new () => SpeechRecognitionInstance)();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = SPEECH_LOCALE_MAP[selectedLanguage || 'en'] || 'en-US';

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              if (result[0]) {
                if (result.isFinal) {
                  finalTranscript += result[0].transcript;
                } else {
                  interim += result[0].transcript;
                }
              }
            }
            // Commit final text to the input
            if (finalTranscript) {
              const base = committedTextRef.current;
              const separator = base && !base.endsWith(' ') ? ' ' : '';
              const newValue = base + separator + finalTranscript;
              committedTextRef.current = newValue;
              onChange(newValue);
              setInterimText('');
              setIsTranscribing(false);
              setTimeout(() => {
                if (recognitionRef.current) setIsTranscribing(true);
              }, 400);
            }
            // Show interim preview (what it's hearing right now)
            if (interim) {
              setInterimText(interim);
              setIsTranscribing(true);
            }
          };

          recognition.onerror = (event: Event) => {
            const errorType = (event as unknown as { error?: string }).error;
            // "no-speech" and "aborted" are non-fatal — let it keep listening
            if (errorType === 'no-speech' || errorType === 'aborted') return;
            recognitionRef.current = null;
            setIsRecording(false);
            setIsTranscribing(false);
          };

          recognition.onend = () => {
            // Some browsers auto-stop after silence — restart if still recording
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                recognitionRef.current = null;
                setIsRecording(false);
                setIsTranscribing(false);
              }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          setIsTranscribing(false);
        }
      } else {
        setIsTranscribing(false);
      }
    };

    const stopRecording = () => {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec?.stop();
      stopAudioVisualizer();
      setIsRecording(false);
      setIsTranscribing(false);
      setInterimText('');
      const ta = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
      ta?.focus();
    };

    const handleActionClick = () => {
      if (isRecording) {
        stopRecording();
      } else if (value.trim().length > 0 || attachedFiles.length > 0) {
        if (!disabled) onSend();
      } else {
        startRecording();
      }
    };

    const getPlaceholder = () => {
      switch (activeMode) {
        case 'search': return 'Search Mews Documentation...';
        case 'think':  return 'Think deeply...';
        case 'canvas': return 'Create on canvas...';
        default:       return placeholder;
      }
    };

    const hasContent = value.trim().length > 0 || attachedFiles.length > 0;
    const fallbackHeights = hero ? FALLBACK_HEIGHTS_32 : FALLBACK_HEIGHTS_24;

    // ── Shared sub-elements ──────────────────────────────────────────────────

    const fileChips = attachedFiles.length > 0 && !isRecording && (
      <div className="file-chips">
        {attachedFiles.map(f => (
          <div key={f.id} className="file-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <span className="file-chip-name">{f.name}</span>
            <button className="file-chip-remove" onClick={() => onRemoveFile(f.id)} aria-label={`Remove ${f.name}`}>×</button>
          </div>
        ))}
      </div>
    );

    const hiddenFileInput = (
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    );

    const inputBox = (
      <div className={`${hero ? 'hero-input-box' : 'input-box'}${isRecording ? ' input-recording' : ''}`}>
        {hero && fileChips}

        {/* Textarea — hidden during recording */}
        {!isRecording && (
          <textarea
            className="chat-textarea"
            ref={ref}
            rows={1}
            placeholder={getPlaceholder()}
            value={value}
            disabled={disabled || isRecording}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        {/* Voice recorder — real audio-reactive or CSS fallback */}
        {isRecording && (
          <div className="voice-recorder">
            <div className="voice-recorder-header">
              <span className="recording-dot" />
              <span className="recording-time">{formatTime(recordingTime)}</span>
              {interimText ? (
                <span className="interim-text">{interimText}</span>
              ) : isTranscribing ? (
                <span className="transcribing-label">Transcribing...</span>
              ) : null}
            </div>
            <div className="voice-visualizer">
              {(useAnimFallback ? fallbackHeights : barData).map((h, i) => (
                <div
                  key={i}
                  className={`visualizer-bar${useAnimFallback ? ' viz-animated' : ''}`}
                  style={useAnimFallback ? {
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: `${0.4 + (((i * 7 + 3) % 11) / 11) * 0.6}s`,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ['--bar-h' as any]: `${h}%`,
                  } : {
                    height: `${h}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer: tools left, action button right */}
        <div className={hero ? 'hero-input-footer' : 'input-box-footer'}>
          <div className={`input-left-tools${isRecording ? ' tools-hidden' : ''}`}>

            {/* Attach file */}
            <button
              className="input-tool-btn"
              type="button"
              aria-label="Attach file"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            <div className="input-divider" />

            {/* Search Mewsy toggle */}
            <button
              type="button"
              className={`input-toggle-btn${activeMode === 'search' ? ' active search-active' : ''}`}
              onClick={() => toggleMode('search')}
              disabled={isRecording}
              title="Search Mews Documentation"
            >
              <span className="toggle-icon-wrap">
                <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </span>
              <span className="toggle-label">Search</span>
            </button>

            <div className="input-divider" />

            {/* Think deeply toggle */}
            <button
              type="button"
              className={`input-toggle-btn${activeMode === 'think' ? ' active think-active' : ''}`}
              onClick={() => toggleMode('think')}
              disabled={isRecording}
              title="Think deeply"
            >
              <span className="toggle-icon-wrap">
                <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>
                  <line x1="9" y1="21" x2="15" y2="21"/>
                  <line x1="10" y1="24" x2="14" y2="24"/>
                </svg>
              </span>
              <span className="toggle-label">Think</span>
            </button>

            <div className="input-divider" />

            {/* Canvas toggle */}
            <button
              type="button"
              className={`input-toggle-btn${activeMode === 'canvas' ? ' active canvas-active' : ''}`}
              onClick={() => toggleMode('canvas')}
              disabled={isRecording}
              title="Canvas"
            >
              <span className="toggle-icon-wrap">
                <svg className="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  <polyline points="10 13 12 15 14 13"/>
                  <line x1="12" y1="15" x2="12" y2="10"/>
                </svg>
              </span>
              <span className="toggle-label">Canvas</span>
            </button>
          </div>

          {/* Action button: mic / send / stop */}
          <button
            className={`input-action-btn${hasContent ? ' has-content' : ''}${isRecording ? ' is-recording' : ''}${disabled && !isRecording ? ' is-loading' : ''}`}
            type="button"
            aria-label={isRecording ? 'Stop recording' : hasContent ? 'Send' : 'Voice input'}
            title={isRecording ? 'Stop recording' : hasContent ? 'Send message' : 'Start voice input'}
            onClick={handleActionClick}
            disabled={disabled && !isRecording && !hasContent}
          >
            {disabled && !isRecording ? (
              /* Loading — pulsing square */
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="7" width="10" height="10" rx="1.5"/>
              </svg>
            ) : isRecording ? (
              /* Stop recording */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor"/>
              </svg>
            ) : hasContent ? (
              /* Send — arrow up */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            ) : (
              /* Microphone */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    );

    // Hero mode: return just the input box (no footer wrapper)
    if (hero) {
      return (
        <>
          {hiddenFileInput}
          {inputBox}
        </>
      );
    }

    // Regular mode: wrap in footer
    return (
      <div id="chat-widget-footer">
        {fileChips}
        {hiddenFileInput}
        {inputBox}
      </div>
    );
  }
);
