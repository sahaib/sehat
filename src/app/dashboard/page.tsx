'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

interface DashboardData {
  total: number;
  emergencyCount: number;
  avgConfidence: number;
  severityDistribution: Record<string, number>;
  topSymptoms: Array<{ symptom: string; count: number }>;
  timeline: Array<{ date: string; emergency: number; urgent: number; routine: number; self_care: number }>;
  trends?: {
    sessions: 'up' | 'down' | 'stable';
    emergencies: 'up' | 'down' | 'stable';
    sessionsThisWeek: number;
    sessionsPrevWeek: number;
  };
}

const TREND_ICONS: Record<string, string> = { up: '\u2191', down: '\u2193', stable: '\u2192' };
const TREND_COLORS: Record<string, string> = {
  up: 'text-orange-500', down: 'text-green-500', stable: 'text-gray-400',
};

const SEVERITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-500',
  urgent: 'bg-orange-500',
  routine: 'bg-yellow-500',
  self_care: 'bg-green-500',
};

const SEVERITY_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  urgent: 'Urgent',
  routine: 'Routine',
  self_care: 'Self Care',
};

const SEVERITY_TEXT_COLORS: Record<string, string> = {
  emergency: 'text-red-600',
  urgent: 'text-orange-600',
  routine: 'text-yellow-600',
  self_care: 'text-green-600',
};

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="card-clinical p-5">
      <p className="section-label">{label}</p>
      <p className={`metric-value text-3xl mt-1 ${accent || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.status === 401) {
          setError('sign-in');
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        setData(await res.json());
      } catch {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <AppShell title="Health Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-clinical p-5">
                <div className="skeleton h-3 w-20 mb-3" />
                <div className="skeleton h-8 w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card-clinical p-5 h-48">
                <div className="skeleton h-3 w-32 mb-4" />
                <div className="space-y-3">
                  <div className="skeleton h-5 w-full" />
                  <div className="skeleton h-5 w-4/5" />
                  <div className="skeleton h-5 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error === 'sign-in') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-700">Sign in to view dashboard</h2>
        <p className="text-gray-400 text-center max-w-sm">Your health trends are tracked when you&apos;re signed in.</p>
        <Link href="/" className="mt-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
          Back to Sehat
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{error || 'No data'}</p>
      </div>
    );
  }

  const sevMax = Math.max(...Object.values(data.severityDistribution), 1);
  const mostCommonSeverity = Object.entries(data.severityDistribution)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <AppShell title="Health Dashboard">
      <div className="space-y-6">
        {data.total === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400">No triage data yet</p>
            <Link href="/" className="inline-block px-5 py-2 bg-teal-600 text-white text-sm rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Start a triage
            </Link>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard
                label="Consultations"
                value={data.total}
                accent="text-teal-700"
                sub={data.trends ? `${TREND_ICONS[data.trends.sessions]} ${data.trends.sessionsThisWeek} this week` : undefined}
              />
              <KPICard
                label="Emergencies"
                value={data.emergencyCount}
                accent={data.emergencyCount > 0 ? 'text-red-600' : 'text-gray-800'}
                sub={data.trends && data.emergencyCount > 0 ? `Trend: ${TREND_ICONS[data.trends.emergencies]}` : undefined}
              />
              <KPICard
                label="Avg Confidence"
                value={`${data.avgConfidence}%`}
                accent="text-teal-700"
              />
              <KPICard
                label="Top Severity"
                value={mostCommonSeverity ? SEVERITY_LABELS[mostCommonSeverity[0]] : '-'}
                sub={mostCommonSeverity ? `${mostCommonSeverity[1]} occurrence${mostCommonSeverity[1] !== 1 ? 's' : ''}` : undefined}
                accent={mostCommonSeverity ? SEVERITY_TEXT_COLORS[mostCommonSeverity[0]] : undefined}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Severity Distribution */}
              <div className="card-clinical p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Severity Breakdown
                </h2>
                <div className="space-y-3">
                  {(['emergency', 'urgent', 'routine', 'self_care'] as const).map(sev => {
                    const val = data.severityDistribution[sev] || 0;
                    const pct = sevMax > 0 ? Math.round((val / sevMax) * 100) : 0;
                    return (
                      <div key={sev} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-600 w-20">
                          {SEVERITY_LABELS[sev]}
                        </span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${SEVERITY_COLORS[sev]} rounded-full transition-all duration-700`}
                            style={{ width: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-8 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Common Symptoms */}
              <div className="card-clinical p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Common Symptoms
                </h2>
                {data.topSymptoms.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No symptom data</p>
                ) : (
                  <div className="space-y-2">
                    {data.topSymptoms.map((s, i) => (
                      <div key={s.symptom} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm text-gray-700 truncate capitalize">{s.symptom}</span>
                        <span className="text-xs text-gray-400">{s.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {data.timeline.length > 0 && (
              <div className="card-clinical p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Activity Timeline
                </h2>
                <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                  {data.timeline.map((day) => {
                    const dayTotal = day.emergency + day.urgent + day.routine + day.self_care;
                    const maxHeight = 100; // percentage
                    const maxDayTotal = Math.max(...data.timeline.map(d => d.emergency + d.urgent + d.routine + d.self_care), 1);
                    const barHeight = Math.max((dayTotal / maxDayTotal) * maxHeight, 8);

                    return (
                      <div key={day.date} className="flex flex-col items-center gap-1 min-w-[28px]" title={`${day.date}: ${dayTotal} session${dayTotal !== 1 ? 's' : ''}`}>
                        <div className="flex flex-col-reverse w-5 rounded-full overflow-hidden" style={{ height: `${barHeight}%` }}>
                          {day.self_care > 0 && <div className="bg-green-500 flex-shrink-0" style={{ flex: day.self_care }} />}
                          {day.routine > 0 && <div className="bg-yellow-500 flex-shrink-0" style={{ flex: day.routine }} />}
                          {day.urgent > 0 && <div className="bg-orange-500 flex-shrink-0" style={{ flex: day.urgent }} />}
                          {day.emergency > 0 && <div className="bg-red-500 flex-shrink-0" style={{ flex: day.emergency }} />}
                        </div>
                        <span className="text-[9px] text-gray-300 -rotate-45 origin-center whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 justify-center">
                  {(['emergency', 'urgent', 'routine', 'self_care'] as const).map(sev => (
                    <div key={sev} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_COLORS[sev]}`} />
                      <span className="text-[10px] text-gray-400">{SEVERITY_LABELS[sev]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-[10px] text-gray-300 pb-4">
          Your health data is private and visible only to you.
        </p>
      </div>
    </AppShell>
  );
}
