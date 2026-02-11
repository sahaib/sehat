'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import ReadAloudButton from '@/components/ReadAloudButton';

interface PeriodCycle {
  id: string;
  cycle_start: string;
  cycle_end: string | null;
  period_length: number | null;
  cycle_length: number | null;
  flow_level: string | null;
  symptoms: string[];
  mood: string | null;
  notes: string | null;
  created_at: string;
}

interface Predictions {
  avgCycleLength: number;
  avgPeriodLength: number;
  nextPeriodDate: string | null;
  notification: string | null;
}

const FLOW_OPTIONS = [
  { value: 'light', label: 'Light', color: 'bg-pink-200' },
  { value: 'medium', label: 'Medium', color: 'bg-pink-400' },
  { value: 'heavy', label: 'Heavy', color: 'bg-pink-600' },
];

const SYMPTOM_OPTIONS = [
  'Cramps', 'Headache', 'Back pain', 'Bloating', 'Fatigue',
  'Mood swings', 'Acne', 'Breast tenderness', 'Nausea', 'Cravings',
];

const MOOD_OPTIONS = ['Happy', 'Calm', 'Anxious', 'Sad', 'Irritable', 'Energetic', 'Tired'];

export default function PeriodHealthPage() {
  const [cycles, setCycles] = useState<PeriodCycle[]>([]);
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('hi');

  // Log form state
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logPeriodLength, setLogPeriodLength] = useState('5');
  const [logFlow, setLogFlow] = useState('medium');
  const [logSymptoms, setLogSymptoms] = useState<string[]>([]);
  const [logMood, setLogMood] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // AI Q&A state
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('sehat_language');
    if (saved) setLanguage(saved as Language);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/period-tracker');
      if (res.status === 401) {
        setError('sign-in');
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCycles(data.cycles);
      setPredictions(data.predictions);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogCycle = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/period-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          cycle_start: logDate,
          period_length: parseInt(logPeriodLength) || null,
          flow_level: logFlow || null,
          symptoms: logSymptoms,
          mood: logMood || null,
          notes: logNotes || null,
        }),
      });
      if (res.ok) {
        setShowLogForm(false);
        setLogSymptoms([]);
        setLogMood('');
        setLogNotes('');
        // Refresh data
        await fetchData();
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleAskAI = async () => {
    if (!question.trim()) return;
    setAiLoading(true);
    setAiAnswer('');
    try {
      const res = await fetch('/api/period-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question,
          language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data.answer);
      }
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  const toggleSymptom = (s: string) => {
    setLogSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <header className="bg-white border-b border-pink-100 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <div className="w-32 h-5 rounded bg-pink-100 animate-pulse" />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-pink-100 p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error === 'sign-in') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
          <span className="text-3xl">🌸</span>
        </div>
        <h2 className="text-xl font-bold text-gray-700">Sign in to track your period health</h2>
        <p className="text-gray-400 text-center max-w-sm">
          Your cycle data is private and only visible to you.
        </p>
        <Link href="/" className="mt-2 px-6 py-2.5 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 transition-colors">
          Back to Sehat
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === language);
  const speechCode = langConfig?.speechCode || 'en-IN';
  const daysUntilNext = predictions?.nextPeriodDate
    ? Math.floor((new Date(predictions.nextPeriodDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-pink-500 hover:text-pink-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Period Health</h1>
              <p className="text-[10px] text-pink-400">AI-powered menstrual wellness</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="text-xs border border-pink-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Notification Banner */}
        {predictions?.notification && (
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
            <span className="text-2xl flex-shrink-0">🔔</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-pink-800">{predictions.notification}</p>
            </div>
          </div>
        )}

        {/* Prediction Card */}
        {predictions && (
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Cycle Overview</h2>
              {cycles.length > 0 && (
                <span className="text-xs text-pink-400">{cycles.length} cycle{cycles.length !== 1 ? 's' : ''} logged</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-pink-600">{predictions.avgCycleLength}</p>
                <p className="text-xs text-gray-400">Avg Cycle (days)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-500">{predictions.avgPeriodLength}</p>
                <p className="text-xs text-gray-400">Avg Period (days)</p>
              </div>
              <div>
                {daysUntilNext !== null ? (
                  <>
                    <p className={`text-2xl font-bold ${daysUntilNext < 0 ? 'text-orange-500' : daysUntilNext <= 3 ? 'text-pink-600' : 'text-gray-700'}`}>
                      {daysUntilNext < 0 ? `${Math.abs(daysUntilNext)}` : daysUntilNext}
                    </p>
                    <p className="text-xs text-gray-400">{daysUntilNext < 0 ? 'Days late' : 'Days until next'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-300">--</p>
                    <p className="text-xs text-gray-400">Next period</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Log Period Button */}
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium
                     rounded-xl shadow-lg shadow-pink-200/50 hover:from-pink-600 hover:to-pink-700
                     transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          Log Period
        </button>

        {/* Log Form */}
        {showLogForm && (
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-gray-700">Log Your Period</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Period Length (days)</label>
                <input
                  type="number"
                  value={logPeriodLength}
                  onChange={(e) => setLogPeriodLength(e.target.value)}
                  min="1" max="14"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Flow Level</label>
              <div className="flex gap-2">
                {FLOW_OPTIONS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setLogFlow(f.value)}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                      logFlow === f.value
                        ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${f.color} mr-1`} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Symptoms</label>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      logSymptoms.includes(s)
                        ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Mood</label>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setLogMood(logMood === m ? '' : m)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      logMood === m
                        ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
              <textarea
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            <button
              onClick={handleLogCycle}
              disabled={saving}
              className="w-full py-2.5 bg-pink-500 text-white font-medium rounded-xl
                         hover:bg-pink-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {/* AI Health Assistant */}
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-sm font-semibold text-gray-700">Ask About Period Health</h2>
            <span className="text-[10px] text-pink-400 ml-auto">Powered by Claude</span>
          </div>
          <p className="text-xs text-gray-400">
            Ask anything about periods, cycle health, hygiene, PCOS, or menstrual wellness — in your language.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder={language === 'hi' ? 'अपना सवाल पूछें...' : language === 'ta' ? 'உங்கள் கேள்வியைக் கேளுங்கள்...' : 'Ask your question...'}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200"
              disabled={aiLoading}
            />
            <button
              onClick={handleAskAI}
              disabled={aiLoading || !question.trim()}
              className="px-4 py-2 bg-pink-500 text-white text-sm rounded-lg font-medium
                         hover:bg-pink-600 transition-colors disabled:opacity-50"
            >
              {aiLoading ? '...' : 'Ask'}
            </button>
          </div>

          {/* Suggested questions */}
          {!aiAnswer && !aiLoading && (
            <div className="flex flex-wrap gap-1.5">
              {[
                language === 'hi' ? 'पीरियड्स में दर्द कम करने के उपाय' : 'How to reduce period pain naturally',
                language === 'hi' ? 'PCOS क्या है?' : 'What is PCOS?',
                language === 'hi' ? 'पीरियड में क्या खाना चाहिए' : 'What to eat during periods',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); }}
                  className="text-[11px] text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full
                             hover:bg-pink-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center gap-2 text-sm text-pink-500">
              <div className="animate-spin w-4 h-4 border-2 border-pink-200 border-t-pink-500 rounded-full" />
              Thinking...
            </div>
          )}

          {aiAnswer && (
            <div className="bg-pink-50/50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap animate-fade-in">
              {aiAnswer}
              <div className="mt-3 pt-2 border-t border-pink-100 flex items-center gap-2">
                <ReadAloudButton text={aiAnswer} languageCode={speechCode} size="sm" />
                <span className="text-[10px] text-gray-400 italic">AI response — consult a doctor for medical advice</span>
              </div>
            </div>
          )}
        </div>

        {/* Cycle History */}
        {cycles.length > 0 && (
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Cycle History
            </h2>
            <div className="space-y-2">
              {cycles.slice(0, 12).map((c) => {
                const startDate = new Date(c.cycle_start);
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-pink-600">
                        {startDate.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">
                        {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {c.period_length && <span>{c.period_length} days</span>}
                        {c.flow_level && (
                          <span className="capitalize">{c.flow_level} flow</span>
                        )}
                        {c.cycle_length && (
                          <span>{c.cycle_length}d cycle</span>
                        )}
                      </div>
                    </div>
                    {c.symptoms && c.symptoms.length > 0 && (
                      <div className="text-[10px] text-gray-400 truncate max-w-[100px]">
                        {c.symptoms.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {cycles.length === 0 && !showLogForm && (
          <div className="text-center py-8 space-y-3">
            <span className="text-5xl">🌸</span>
            <h3 className="text-lg font-semibold text-gray-700">Start tracking your cycle</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Log your periods to get personalized predictions, health insights, and reminders — all in your language.
            </p>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-300 pb-4">
          Your period data is private and visible only to you. Not a medical diagnosis.
        </p>
      </div>
    </div>
  );
}
