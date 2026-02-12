'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TriageResult as TriageResultType, Message, Language } from '@/types';
import ConversationThread from '@/components/ConversationThread';
import TriageResult from '@/components/TriageResult';
import DoctorSummary from '@/components/DoctorSummary';
import ThinkingDisplay from '@/components/ThinkingDisplay';
import RenderMarkdown from '@/components/RenderMarkdown';

interface SessionDetail {
  session: {
    session_id: string;
    language: string;
    severity: string;
    confidence: number;
    symptoms: string[];
    input_mode: string;
    reasoning_summary: string;
    is_emergency: boolean;
    created_at: string;
  };
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
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.status === 401) {
          setError('sign-in');
          return;
        }
        if (res.status === 404) {
          setError('Session not found');
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setData(json);
      } catch {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error === 'sign-in' ? 'Sign in to view this session' : error}</p>
        <Link href="/history" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          Back to history
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { session, messages, result, thinkingContent } = data;
  const language = (session.language || 'en') as Language;

  // Convert DB messages to the Message type used by ConversationThread
  const threadMessages: Message[] = messages.map((m, i) => ({
    id: m.id || String(i),
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at).getTime(),
    language: (m.language || language) as Language,
    isFollowUp: m.is_follow_up,
  }));

  const date = new Date(session.created_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/history" className="text-gray-400 hover:text-teal-600 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Session Replay</h1>
              <p className="text-xs text-gray-400">
                {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <Link
            href={`/?resumeSession=${sessionId}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white text-sm font-medium
                       rounded-xl hover:bg-teal-700 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            Continue
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Session metadata bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {session.is_emergency && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">EMERGENCY</span>
          )}
          {session.input_mode && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
              {session.input_mode === 'voice_conversation' ? 'Voice' : session.input_mode}
            </span>
          )}
          {session.symptoms && session.symptoms.length > 0 && (
            <span className="text-gray-400">
              {session.symptoms.join(', ')}
            </span>
          )}
        </div>

        {/* Conversation */}
        {threadMessages.length > 0 ? (
          <ConversationThread messages={threadMessages} language={language} />
        ) : result && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 italic">
            {session.is_emergency
              ? 'Emergency detected — immediate triage bypassed conversation.'
              : 'No conversation messages recorded for this session.'}
          </div>
        )}

        {/* Thinking toggle */}
        {thinkingContent && (
          <div>
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-teal-600 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showThinking ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {showThinking ? 'Hide' : 'Show'} AI reasoning
            </button>
            {showThinking && (
              <div className="mt-2">
                <ThinkingDisplay content={thinkingContent} isThinking={false} />
              </div>
            )}
          </div>
        )}

        {/* Triage Result */}
        {result && (
          <>
            {result.is_medical_query === false ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="text-gray-600"><RenderMarkdown text={result.redirect_message || ''} /></div>
              </div>
            ) : (
              <>
                <TriageResult result={result} language={language} />
                {result.action_plan?.tell_doctor && (
                  <DoctorSummary
                    summary={result.action_plan.tell_doctor}
                    severity={result.severity}
                    symptoms={result.symptoms_identified}
                    result={result}
                    language={language}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* No data fallback */}
        {!result && threadMessages.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <p className="text-gray-400">No detailed data available for this session.</p>
            {session.reasoning_summary && (
              <div className="text-sm text-gray-500 max-w-md mx-auto"><RenderMarkdown text={session.reasoning_summary} /></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
