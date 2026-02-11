'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SEVERITY_CONFIG } from '@/lib/constants';
import { Severity } from '@/types';

interface SessionSummary {
  session_id: string;
  language: string;
  severity: Severity | null;
  confidence: number | null;
  symptoms: string[];
  input_mode: string;
  reasoning_summary: string | null;
  is_emergency: boolean;
  created_at: string;
}

const LANG_LABELS: Record<string, string> = {
  hi: 'Hindi', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
  kn: 'Kannada', bn: 'Bengali', en: 'English',
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sessions?page=${page}&limit=${limit}`);
        if (res.status === 401) {
          setError('sign-in');
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setSessions(data.sessions);
        setTotal(data.total);
      } catch {
        setError('Failed to load history');
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
      </div>
    );
  }

  if (error === 'sign-in') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-700">Sign in to view history</h2>
        <p className="text-gray-400 text-center max-w-sm">Your past triage sessions are saved when you&apos;re signed in.</p>
        <Link href="/" className="mt-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
          Back to Sehat
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-teal-600 hover:text-teal-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-800">Chat History</h1>
          </div>
          <span className="text-xs text-gray-400">{total} session{total !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-gray-400">No triage sessions yet</p>
            <Link href="/" className="inline-block px-5 py-2 bg-teal-600 text-white text-sm rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Start a triage
            </Link>
          </div>
        ) : (
          sessions.map((s) => {
            const config = s.severity ? SEVERITY_CONFIG[s.severity] : null;
            const date = new Date(s.created_at);
            return (
              <Link
                key={s.session_id}
                href={`/history/${s.session_id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {config && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${config.bgColor} ${config.textColor}`}>
                          {config.icon} {config.label}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {LANG_LABELS[s.language] || s.language}
                      </span>
                      {s.is_emergency && (
                        <span className="text-xs font-bold text-red-600">EMERGENCY</span>
                      )}
                    </div>
                    {s.symptoms && s.symptoms.length > 0 && (
                      <p className="text-sm text-gray-600 truncate">
                        {s.symptoms.join(', ')}
                      </p>
                    )}
                    {s.reasoning_summary && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {s.reasoning_summary}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-300">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-1 capitalize">
                      {s.input_mode === 'voice_conversation' ? 'Voice' : s.input_mode}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
