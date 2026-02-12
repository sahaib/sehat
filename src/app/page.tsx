'use client';

import { useReducer, useCallback, useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CLERK_ENABLED } from '@/hooks/useAuth';
import ClerkAuthButtons from '@/components/ClerkAuthButtons';
import {
  ConversationState,
  ConversationAction,
  StreamEvent,
  Message,
  Language,
  TriageResult as TriageResultType,
} from '@/types';
import { detectEmergency } from '@/lib/emergency-detector';
import { MAX_FOLLOW_UPS, SUPPORTED_LANGUAGES } from '@/lib/constants';
import LanguageSelector from '@/components/LanguageSelector';
import TextInput from '@/components/TextInput';
import ConversationThread from '@/components/ConversationThread';
import EmergencyBanner from '@/components/EmergencyBanner';
import ThinkingDisplay from '@/components/ThinkingDisplay';
import TriageResult from '@/components/TriageResult';
import DoctorSummary from '@/components/DoctorSummary';
import VoiceInput from '@/components/VoiceInput';
import VoiceConversationMode from '@/components/VoiceConversationMode';
import ErrorBoundary from '@/components/ErrorBoundary';
import SignUpPrompt from '@/components/SignUpPrompt';
import ProfileForm from '@/components/ProfileForm';
import FileUpload from '@/components/FileUpload';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import ReadAloudButton from '@/components/ReadAloudButton';
import SehatOrb from '@/components/SehatOrb';
import { prewarmTTS } from '@/lib/tts-client';
import { startCalmAudio, stopCalmAudio } from '@/lib/calm-audio';
import Link from 'next/link';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Welcome messages per language
const WELCOME_GREETINGS: Record<Language, string> = {
  hi: 'नमस्ते! कैसे हैं आप?',
  ta: 'வணக்கம்! எப்படி இருக்கீர்கள்?',
  te: 'నమస్కారం! ఎలా ఉన్నారు?',
  mr: 'नमस्कार! कसे आहात?',
  kn: 'ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಿ?',
  bn: 'নমস্কার! কেমন আছেন?',
  en: 'Hello! How are you feeling?',
};

const WELCOME_SUBTITLES: Record<Language, string> = {
  hi: 'अपने लक्षण बताएं — हम आपकी मदद करेंगे सही देखभाल तक पहुंचने में।',
  ta: 'உங்கள் அறிகுறிகளை சொல்லுங்கள் — சரியான சிகிச்சைக்கு நாங்கள் வழிகாட்டுவோம்.',
  te: 'మీ లక్షణాలను చెప్పండి — సరైన వైద్యానికి మేము మిమ్మల్ని మార్గదర్శనం చేస్తాము.',
  mr: 'तुमची लक्षणे सांगा — योग्य उपचारापर्यंत पोहोचण्यात आम्ही मदत करू.',
  kn: 'ನಿಮ್ಮ ರೋಗಲಕ್ಷಣಗಳನ್ನು ಹೇಳಿ — ಸರಿಯಾದ ಆರೈಕೆಗೆ ನಾವು ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇವೆ.',
  bn: 'আপনার উপসর্গগুলি বলুন — সঠিক চিকিৎসার দিকে আমরা আপনাকে গাইড করব।',
  en: 'Tell us your symptoms — we\'ll help you understand the severity and guide you to the right care.',
};

const initialState: ConversationState = {
  sessionId: '',
  messages: [],
  currentResult: null,
  thinkingContent: '',
  isThinking: false,
  isStreaming: false,
  followUpCount: 0,
  language: 'hi',
  isEmergency: false,
  emergencyData: null,
  error: null,
  toolSteps: [],
};

function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.language };

    case 'USER_MESSAGE': {
      const msg: Message = {
        id: generateId(),
        role: 'user',
        content: action.message,
        timestamp: Date.now(),
        language: state.language,
      };
      return {
        ...state,
        messages: [...state.messages, msg],
        error: null,
        currentResult: null,
      };
    }

    case 'STREAM_START':
      return {
        ...state,
        isStreaming: true,
        isThinking: false,
        thinkingContent: '',
        error: null,
        toolSteps: [],
      };

    case 'STREAM_THINKING':
      return {
        ...state,
        isThinking: true,
        thinkingContent: state.thinkingContent + action.content,
      };

    case 'STREAM_THINKING_DONE':
      return { ...state, isThinking: false };

    case 'STREAM_RESULT':
      return {
        ...state,
        currentResult: action.data,
        isStreaming: false,
      };

    case 'STREAM_FOLLOW_UP': {
      const followUpMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: action.question,
        timestamp: Date.now(),
        isFollowUp: true,
        followUpOptions: action.options || null,
      };
      return {
        ...state,
        messages: [...state.messages, followUpMsg],
        followUpCount: state.followUpCount + 1,
        isStreaming: false,
      };
    }

    case 'STREAM_TOOL_CALL':
      return {
        ...state,
        toolSteps: [...state.toolSteps, { name: action.name, input: action.input, result: null, status: 'running' }],
      };

    case 'STREAM_TOOL_RESULT':
      return {
        ...state,
        toolSteps: state.toolSteps.map((step) =>
          step.name === action.name && step.status === 'running'
            ? { ...step, result: action.result, status: 'done' as const }
            : step
        ),
      };

    case 'STREAM_EMERGENCY':
      return {
        ...state,
        isEmergency: true,
        emergencyData: action.data,
      };

    case 'STREAM_ERROR':
      return {
        ...state,
        error: action.message,
        isStreaming: false,
        isThinking: false,
      };

    case 'STREAM_END':
      return { ...state, isStreaming: false, isThinking: false };

    case 'CLIENT_EMERGENCY':
      return {
        ...state,
        isEmergency: true,
        emergencyData: action.detection,
      };

    case 'RESTORE_SESSION': {
      // Count follow-ups from restored messages
      const restoredFollowUps = action.messages.filter(
        (m) => m.role === 'assistant' && m.isFollowUp
      ).length;
      return {
        ...initialState,
        sessionId: action.sessionId,
        messages: action.messages,
        currentResult: action.result,
        thinkingContent: action.thinkingContent,
        language: action.language,
        followUpCount: restoredFollowUps,
      };
    }

    case 'RESET':
      return {
        ...initialState,
        sessionId: generateId(),
        language: state.language,
      };

    default:
      return state;
  }
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="animate-spin w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
      </div>
    }>
      <Home />
    </Suspense>
  );
}

function Home() {
  // Generate sessionId on client-side only to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [state, dispatch] = useReducer(conversationReducer, {
    ...initialState,
    sessionId: '',
  });
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [resumedDate, setResumedDate] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Listen for Clerk name sync (fires when ClerkAuthButtons writes firstName to localStorage)
  useEffect(() => {
    const onNameSync = () => {
      const name = localStorage.getItem('sehat_user_name');
      if (name) setUserName(name);
    };
    window.addEventListener('sehat-name-sync', onNameSync);
    return () => window.removeEventListener('sehat-name-sync', onNameSync);
  }, []);

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      // Load user name from localStorage for personalized greeting
      const savedName = localStorage.getItem('sehat_user_name');
      if (savedName) setUserName(savedName);

      const resumeId = searchParams.get('resumeSession');
      if (resumeId) {
        // Restore a previous session
        (async () => {
          try {
            const res = await fetch(`/api/sessions/${resumeId}`);
            if (!res.ok) {
              dispatch({ type: 'RESET' });
              return;
            }
            const data: {
              session: { language: string; created_at: string };
              messages: Array<{
                id: string;
                role: 'user' | 'assistant';
                content: string;
                language: string;
                is_follow_up: boolean;
                created_at: string;
              }>;
              result: TriageResultType | null;
              thinkingContent: string | null;
            } = await res.json();

            const msgs: Message[] = data.messages.map((m, i) => ({
              id: m.id || String(i),
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at).getTime(),
              language: (m.language || data.session.language || 'en') as Language,
              isFollowUp: m.is_follow_up,
            }));

            dispatch({
              type: 'RESTORE_SESSION',
              sessionId: resumeId,
              messages: msgs,
              result: data.result,
              thinkingContent: data.thinkingContent || '',
              language: (data.session.language || 'en') as Language,
            });
            setResumedDate(
              new Date(data.session.created_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
            );
          } catch {
            dispatch({ type: 'RESET' });
          }
        })();
      } else {
        dispatch({ type: 'RESET' });
      }
    }
  }, [mounted, searchParams]);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputModeRef = useRef<'text' | 'voice' | 'voice_conversation'>('text');
  // Track follow-up count in a ref to avoid stale closure in streaming callback
  const followUpCountRef = useRef(state.followUpCount);
  followUpCountRef.current = state.followUpCount;

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-scroll when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [state.messages, state.thinkingContent, state.currentResult]);

  const handleSubmit = useCallback(
    async (text: string) => {
      // Client-side emergency detection (Layer 1)
      const emergencyCheck = detectEmergency(text, state.language);
      if (emergencyCheck.isEmergency) {
        dispatch({ type: 'CLIENT_EMERGENCY', detection: emergencyCheck });
      }

      dispatch({ type: 'USER_MESSAGE', message: text });
      dispatch({ type: 'STREAM_START' });

      // Cancel any previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Offline detection — fail fast instead of hanging
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('You appear to be offline. Please check your internet connection and try again.');
        }

        const response = await fetch('/api/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            language: state.language,
            conversationHistory: state.messages,
            sessionId: state.sessionId,
            inputMode: inputModeRef.current,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Read the error body for better error messages
          let errorDetail = `${response.status}`;
          try {
            const errorBody = await response.text();
            if (errorBody) errorDetail = `${response.status} ${errorBody}`;
          } catch {
            // ignore
          }
          throw new Error(`Something went wrong\n${errorDetail}`);
        }

        if (!response.body) {
          throw new Error('No response stream received. Please try again.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
              const event: StreamEvent = JSON.parse(data);
              switch (event.type) {
                case 'thinking':
                  dispatch({
                    type: 'STREAM_THINKING',
                    content: event.content,
                  });
                  break;
                case 'thinking_done':
                  dispatch({ type: 'STREAM_THINKING_DONE' });
                  break;
                case 'result': {
                  if (
                    event.data.needs_follow_up &&
                    event.data.follow_up_question &&
                    followUpCountRef.current < MAX_FOLLOW_UPS
                  ) {
                    dispatch({
                      type: 'STREAM_FOLLOW_UP',
                      question: event.data.follow_up_question,
                      options: event.data.follow_up_options || undefined,
                    });
                  }
                  dispatch({ type: 'STREAM_RESULT', data: event.data });

                  // TTS pre-warm is handled by the voiceTextToSpeak useEffect,
                  // which ensures the pre-warmed text exactly matches what will be spoken
                  // (including truncation). Prewarming here caused duplicate TTS requests
                  // when text didn't match exactly.
                  break;
                }
                case 'follow_up':
                  break;
                case 'early_tts':
                  // Ignored — early_tts text can differ slightly from final parsed result
                  // (due to clean() in parseTriageResult), causing cache key mismatch and
                  // duplicate TTS requests. The result-event prewarm is sufficient.
                  break;
                case 'tool_call':
                  dispatch({
                    type: 'STREAM_TOOL_CALL',
                    name: event.name,
                    input: event.input,
                  });
                  break;
                case 'tool_result':
                  dispatch({
                    type: 'STREAM_TOOL_RESULT',
                    name: event.name,
                    result: event.result,
                  });
                  break;
                case 'emergency':
                  dispatch({
                    type: 'STREAM_EMERGENCY',
                    data: event.data,
                  });
                  break;
                case 'error':
                  dispatch({
                    type: 'STREAM_ERROR',
                    message: event.message,
                  });
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        dispatch({ type: 'STREAM_END' });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          dispatch({
            type: 'STREAM_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to connect. Please try again.',
          });
        }
      }
    },
    [state.language, state.messages, state.sessionId]
  );

  const handleTextSubmit = useCallback((text: string) => {
    inputModeRef.current = 'text';
    handleSubmit(text);
  }, [handleSubmit]);

  const handleVoiceSubmit = useCallback((text: string) => {
    inputModeRef.current = 'voice';
    handleSubmit(text);
  }, [handleSubmit]);

  const handleVoiceConversationSubmit = useCallback((text: string) => {
    inputModeRef.current = 'voice_conversation';
    handleSubmit(text);
  }, [handleSubmit]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });
    setResumedDate(null);
    // Clear resumeSession from URL without full page reload
    if (searchParams.get('resumeSession')) {
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  // Voice conversation mode
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const voiceTextRef = useRef<string | null>(null);

  // Play calm ambient audio during thinking (text mode only — voice mode handles its own)
  useEffect(() => {
    if (state.isThinking && !isVoiceMode) {
      startCalmAudio();
    } else if (!state.isThinking) {
      stopCalmAudio();
    }
  }, [state.isThinking, isVoiceMode]);

  // TTS pre-warm is fired inline during SSE stream processing (in handleSubmit)
  // when the 'result' event arrives — this overlaps TTS synthesis with the
  // remaining stream. No separate useEffect needed for the main prewarm.

  const hasConversation = state.messages.length > 0;
  const showResult =
    state.currentResult &&
    (!state.currentResult.needs_follow_up ||
      state.followUpCount >= MAX_FOLLOW_UPS);
  const isInputDisabled = state.isStreaming || state.isThinking;

  // Derive text to auto-speak in voice mode.
  // IMPORTANT: Keep it SHORT — voice should give a concise summary, not read a report.
  // Max ~300 chars, truncated at sentence boundary.
  const voiceTextToSpeak = useMemo(() => {
    if (!isVoiceMode || state.isThinking) return null;

    const truncateForVoice = (text: string, maxLen = 300): string => {
      if (text.length <= maxLen) return text;
      // Find last sentence boundary before maxLen
      const truncated = text.slice(0, maxLen);
      const lastSentence = truncated.lastIndexOf('।') !== -1
        ? truncated.lastIndexOf('।')
        : truncated.lastIndexOf('. ') !== -1
          ? truncated.lastIndexOf('. ')
          : truncated.lastIndexOf('.');
      if (lastSentence > maxLen * 0.4) {
        return text.slice(0, lastSentence + 1).trim();
      }
      return truncated.trim() + '...';
    };

    // Non-medical redirect
    if (state.currentResult?.is_medical_query === false) {
      return state.currentResult.redirect_message ? truncateForVoice(state.currentResult.redirect_message) : null;
    }

    // Follow-up question
    if (state.currentResult?.needs_follow_up && state.currentResult.follow_up_question && state.followUpCount < MAX_FOLLOW_UPS) {
      return truncateForVoice(state.currentResult.follow_up_question);
    }

    // Final result — speak ONLY the reasoning summary, capped for voice
    if (state.currentResult && (!state.currentResult.needs_follow_up || state.followUpCount >= MAX_FOLLOW_UPS)) {
      return state.currentResult.reasoning_summary ? truncateForVoice(state.currentResult.reasoning_summary) : null;
    }

    return null;
  }, [isVoiceMode, state.isThinking, state.currentResult, state.followUpCount]);

  // Pre-warm TTS for follow-up questions (voice mode will need them)
  useEffect(() => {
    if (voiceTextToSpeak && isVoiceMode) {
      const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === state.language);
      const speechCode = langConfig?.speechCode || 'en-IN';
      prewarmTTS(voiceTextToSpeak, speechCode);
    }
  }, [voiceTextToSpeak, isVoiceMode, state.language]);

  // Reset voice text tracking when entering voice mode
  useEffect(() => {
    if (!isVoiceMode) {
      voiceTextRef.current = null;
    }
  }, [isVoiceMode]);

  return (
    <main className="flex flex-col h-[100dvh] max-w-2xl mx-auto relative overflow-hidden">
      {/* Floating gradient blobs */}
      <div className="gradient-blob gradient-blob-1" aria-hidden="true" />
      <div className="gradient-blob gradient-blob-2" aria-hidden="true" />
      <div className="gradient-blob gradient-blob-3" aria-hidden="true" />

      {/* Ambient glow when AI is thinking (non-voice mode) */}
      {!isVoiceMode && (state.isThinking || (state.isStreaming && state.thinkingContent)) && (
        <div className="ambient-glow ambient-glow--thinking animate-fade-in" aria-hidden="true">
          <div className="ambient-glow-orb" />
          <div className="ambient-glow-orb" />
          <div className="ambient-glow-orb" />
        </div>
      )}

      {/* Emergency Banner Overlay */}
      {state.isEmergency && state.emergencyData && (
        <EmergencyBanner detection={state.emergencyData} />
      )}

      {/* Header — glass morphism */}
      <header className="flex-shrink-0 px-4 pt-4 pb-2 no-print glass-header z-10 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <SehatOrb size="sm" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">Sehat</h1>
              <p className="text-xs text-gray-400">AI Medical Triage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Nav links */}
            <Link
              href="/history"
              className="w-9 h-9 rounded-full flex items-center justify-center
                         text-gray-400 hover:text-teal-600 hover:bg-teal-50/80
                         transition-all duration-200 active:scale-90
                         border border-transparent hover:border-teal-200"
              aria-label="Chat history"
              title="Chat History"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-full flex items-center justify-center
                         text-gray-400 hover:text-teal-600 hover:bg-teal-50/80
                         transition-all duration-200 active:scale-90
                         border border-transparent hover:border-teal-200"
              aria-label="Health dashboard"
              title="Dashboard"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </Link>
            <Link
              href="/period-health"
              className="w-9 h-9 rounded-full flex items-center justify-center
                         text-gray-400 hover:text-pink-500 hover:bg-pink-50/80
                         transition-all duration-200 active:scale-90
                         border border-transparent hover:border-pink-200"
              aria-label="Period health tracker"
              title="Period Health"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </Link>
            {/* Profile button — only when Clerk is NOT enabled (ClerkAuthButtons has its own) */}
            {!CLERK_ENABLED && (
              <button
                onClick={() => setShowProfileForm(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center
                           text-gray-400 hover:text-teal-600 hover:bg-teal-50/80
                           transition-all duration-200 active:scale-90
                           border border-transparent hover:border-teal-200"
                aria-label="Edit health profile"
                title="Health Profile"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </button>
            )}
            {hasConversation && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700
                           px-3 py-1.5 rounded-lg hover:bg-teal-50/80 border border-transparent
                           hover:border-teal-200 transition-all duration-200 active:scale-95"
                aria-label="Start new conversation"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                New
              </button>
            )}
            {mounted && (
              CLERK_ENABLED ? (
                <ClerkAuthButtons onProfileClick={() => setShowProfileForm(true)} />
              ) : (
                <a
                  href="/sign-in"
                  className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50/80
                             px-3 py-1.5 rounded-lg border border-teal-200/60 transition-all duration-200 font-medium
                             backdrop-blur-sm"
                >
                  Sign in
                </a>
              )
            )}
          </div>
        </div>

        <LanguageSelector
          selectedLanguage={state.language}
          onLanguageChange={(lang) =>
            dispatch({ type: 'SET_LANGUAGE', language: lang })
          }
          disabled={isInputDisabled}
        />
      </header>

      {/* Conversation Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide relative z-0"
      >
        {/* Welcome state */}
        {!hasConversation && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-5 py-12 animate-fade-in">
            {/* Large ambient orb */}
            <SehatOrb size="lg" />
            <h2 className="text-3xl font-bold text-gray-800">
              {userName
                ? `${WELCOME_GREETINGS[state.language].split('!')[0]}, ${userName}!`
                : WELCOME_GREETINGS[state.language]}
            </h2>
            <p className="text-gray-500 max-w-sm text-base leading-relaxed">
              {WELCOME_SUBTITLES[state.language]}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-teal-600/70">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Tap the mic or type below
            </p>
          </div>
        )}

        {/* Resumed session banner */}
        {resumedDate && hasConversation && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-2 animate-fade-in">
            <div className="h-px flex-1 bg-gray-200/60" />
            <span className="px-2">Continued from {resumedDate}</span>
            <div className="h-px flex-1 bg-gray-200/60" />
          </div>
        )}

        {/* Messages */}
        <ConversationThread
          messages={state.messages}
          language={state.language}
          onOptionSelect={handleTextSubmit}
          isInputDisabled={isInputDisabled}
        />

        {/* Thinking Display */}
        {(state.isThinking || state.thinkingContent || state.toolSteps.length > 0) && (
          <ThinkingDisplay
            content={state.thinkingContent}
            isThinking={state.isThinking}
            toolSteps={state.toolSteps}
          />
        )}

        {/* Loading skeleton */}
        {state.isStreaming &&
          !state.isThinking &&
          !state.thinkingContent && (
            <div className="flex justify-start animate-fade-in-up">
              <div className="chat-bubble chat-bubble-assistant w-3/4 space-y-2.5">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            </div>
          )}

        {/* Triage Result */}
        {showResult && state.currentResult && (
          state.currentResult.is_medical_query === false ? (
            /* Non-medical query: show friendly redirect as assistant chat bubble */
            <div className="flex justify-start animate-fade-in">
              <div className="chat-bubble chat-bubble-assistant">
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {state.currentResult.redirect_message}
                </p>
                {state.currentResult.redirect_message && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <ReadAloudButton
                      text={state.currentResult.redirect_message}
                      languageCode={SUPPORTED_LANGUAGES.find((l) => l.code === state.language)?.speechCode || 'en-IN'}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <TriageResult result={state.currentResult} language={state.language} />
              <DoctorSummary
                summary={state.currentResult.action_plan.tell_doctor}
                severity={state.currentResult.severity}
                symptoms={state.currentResult.symptoms_identified}
                result={state.currentResult}
                language={state.language}
              />

              {/* File upload for medical reports — only after results */}
              <FileUpload language={state.language} disabled={isInputDisabled} />

              {/* Smart sign-up prompt — only after non-severe results, never interrupt emergency/urgent */}
              {(state.currentResult.severity === 'routine' || state.currentResult.severity === 'self_care') && (
                <SignUpPrompt
                  language={state.language}
                  onProfileClick={() => setShowProfileForm(true)}
                />
              )}
            </>
          )
        )}

        {/* Error display */}
        {state.error && (
          <div
            className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-2xl p-5 animate-fade-in-up"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-800 text-sm">Something went wrong</p>
                <p className="text-red-600 text-sm mt-1 whitespace-pre-line break-words">{state.error}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 w-full py-2.5 bg-red-600 text-white text-sm font-medium
                         rounded-xl hover:bg-red-700 transition-colors active:scale-[0.98]"
            >
              Start over
            </button>
          </div>
        )}
      </div>

      {/* Input Area (fixed at bottom) — glass */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 no-print safe-bottom z-10 relative"
           style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95) 60%, rgba(255,255,255,0))' }}>
        {isVoiceMode ? (
          <ErrorBoundary>
            <VoiceConversationMode
              language={state.language}
              onTranscript={handleVoiceConversationSubmit}
              onExit={() => setIsVoiceMode(false)}
              textToSpeak={voiceTextToSpeak}
              isProcessing={state.isStreaming || state.isThinking}
            />
          </ErrorBoundary>
        ) : (
          <div className="relative">
            <TextInput
              onSubmit={handleTextSubmit}
              disabled={isInputDisabled}
              language={state.language}
              extraActions={
                <>
                  <VoiceInput
                    onTranscript={handleVoiceSubmit}
                    language={state.language}
                    disabled={isInputDisabled}
                  />
                  <button
                    onClick={() => setIsVoiceMode(true)}
                    disabled={isInputDisabled}
                    className="w-9 h-9 rounded-lg flex items-center justify-center
                               text-gray-400 hover:text-teal-600 hover:bg-teal-50/80
                               transition-all duration-200 active:scale-90
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Start voice conversation"
                    title="Voice conversation mode"
                  >
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <line x1="4" y1="10" x2="4" y2="14" />
                      <line x1="8" y1="7" x2="8" y2="17" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                      <line x1="16" y1="7" x2="16" y2="17" />
                      <line x1="20" y1="10" x2="20" y2="14" />
                    </svg>
                  </button>
                </>
              }
            />
          </div>
        )}
        <DisclaimerFooter />
      </div>

      {/* Profile Form Modal */}
      {showProfileForm && (
        <ProfileForm
          language={state.language}
          onClose={() => {
            setShowProfileForm(false);
            // Refresh name after profile save
            const savedName = localStorage.getItem('sehat_user_name');
            setUserName(savedName || '');
          }}
        />
      )}
    </main>
  );
}
