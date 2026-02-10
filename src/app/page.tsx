'use client';

import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import {
  ConversationState,
  ConversationAction,
  StreamEvent,
  Message,
  Language,
} from '@/types';
import { detectEmergency } from '@/lib/emergency-detector';
import { MAX_FOLLOW_UPS } from '@/lib/constants';
import LanguageSelector from '@/components/LanguageSelector';
import TextInput from '@/components/TextInput';
import ConversationThread from '@/components/ConversationThread';
import EmergencyBanner from '@/components/EmergencyBanner';
import ThinkingDisplay from '@/components/ThinkingDisplay';
import TriageResult from '@/components/TriageResult';
import DoctorSummary from '@/components/DoctorSummary';
import VoiceInput from '@/components/VoiceInput';
import DisclaimerFooter from '@/components/DisclaimerFooter';

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
      };
      return {
        ...state,
        messages: [...state.messages, followUpMsg],
        followUpCount: state.followUpCount + 1,
        isStreaming: false,
      };
    }

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

export default function Home() {
  // Generate sessionId on client-side only to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [state, dispatch] = useReducer(conversationReducer, {
    ...initialState,
    sessionId: '',
  });

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      dispatch({ type: 'RESET' });
    }
  }, [mounted]);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const response = await fetch('/api/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            language: state.language,
            conversationHistory: state.messages,
            sessionId: state.sessionId,
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
                case 'result':
                  if (
                    event.data.needs_follow_up &&
                    event.data.follow_up_question &&
                    state.followUpCount < MAX_FOLLOW_UPS
                  ) {
                    dispatch({
                      type: 'STREAM_FOLLOW_UP',
                      question: event.data.follow_up_question,
                    });
                  }
                  dispatch({ type: 'STREAM_RESULT', data: event.data });
                  break;
                case 'follow_up':
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
    [state.language, state.messages, state.sessionId, state.followUpCount]
  );

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  const hasConversation = state.messages.length > 0;
  const showResult =
    state.currentResult &&
    (!state.currentResult.needs_follow_up ||
      state.followUpCount >= MAX_FOLLOW_UPS);
  const isInputDisabled = state.isStreaming || state.isThinking;

  return (
    <main className="flex flex-col h-[100dvh] max-w-2xl mx-auto relative">
      {/* Emergency Banner Overlay */}
      {state.isEmergency && state.emergencyData && (
        <EmergencyBanner detection={state.emergencyData} />
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-4 pb-2 no-print">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center shadow-sm">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-teal-800">Sehat</h1>
              <p className="text-xs text-gray-400">AI Medical Triage</p>
            </div>
          </div>
          {hasConversation && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700
                         px-3 py-1.5 rounded-lg hover:bg-teal-50 border border-transparent
                         hover:border-teal-200 transition-all duration-200"
              aria-label="Start new conversation"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              New
            </button>
          )}
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
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide"
      >
        {/* Welcome state */}
        {!hasConversation && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-teal-600"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-700">
              {WELCOME_GREETINGS[state.language]}
            </h2>
            <p className="text-gray-400 max-w-sm text-base">
              {WELCOME_SUBTITLES[state.language]}
            </p>
          </div>
        )}

        {/* Messages */}
        <ConversationThread messages={state.messages} />

        {/* Thinking Display */}
        {(state.isThinking || state.thinkingContent) && (
          <ThinkingDisplay
            content={state.thinkingContent}
            isThinking={state.isThinking}
          />
        )}

        {/* Loading indicator */}
        {state.isStreaming &&
          !state.isThinking &&
          !state.thinkingContent && (
            <div className="flex items-center gap-2 text-teal-600 animate-fade-in">
              <div className="shimmer-bg rounded-2xl p-4 w-3/4">
                <div className="h-4 bg-teal-100/50 rounded mb-2 w-full" />
                <div className="h-4 bg-teal-100/50 rounded w-2/3" />
              </div>
            </div>
          )}

        {/* Triage Result */}
        {showResult && state.currentResult && (
          <>
            <TriageResult result={state.currentResult} language={state.language} />
            <DoctorSummary
              summary={state.currentResult.action_plan.tell_doctor}
              severity={state.currentResult.severity}
              symptoms={state.currentResult.symptoms_identified}
            />
          </>
        )}

        {/* Error display */}
        {state.error && (
          <div
            className="bg-red-50 border border-red-200 rounded-2xl p-5 animate-fade-in"
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

      {/* Input Area (fixed at bottom) */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-gradient-to-t from-white via-white to-transparent no-print safe-bottom">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextInput
              onSubmit={handleSubmit}
              disabled={isInputDisabled}
              language={state.language}
            />
          </div>
          <VoiceInput
            onTranscript={handleSubmit}
            language={state.language}
            disabled={isInputDisabled}
          />
        </div>
        <DisclaimerFooter />
      </div>
    </main>
  );
}
