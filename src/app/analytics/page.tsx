'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Metrics {
  totalTriages: number;
  totalEmergenciesDetected: number;
  totalVoiceSessions: number;
  languagesServed: number;
  voiceUsagePercent: number;
  uptimeMs: number;
  triagesLast24h: number;
  emergenciesLast24h: number;
  triagesLastHour: number;
  severityDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  inputModeDistribution: { text: number; voice: number; voice_conversation: number };
  performance: {
    avgTriageMs: number;
    p95TriageMs: number;
    avgSTTMs: number;
    avgTTSMs: number;
  };
  quality: {
    avgConfidence: number;
    followUpRate: number;
    nonMedicalRate: number;
  };
  voicePipeline: {
    sttSuccessRate: number;
    ttsSuccessRate: number;
    totalSTTRequests: number;
    totalTTSRequests: number;
  };
  errors: {
    triageErrorRate: number;
    triageErrors: number;
    sttErrors: number;
    ttsErrors: number;
  };
  recentActivity: Array<{
    timestamp: number;
    language: string;
    severity: string | null;
    isEmergency: boolean;
    inputMode: string;
    latencyMs: number;
    isMedicalQuery: boolean;
  }>;
  isAdmin?: boolean;
  dataSource?: 'supabase' | 'memory';
}

const LANG_LABELS: Record<string, string> = {
  hi: 'Hindi', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
  kn: 'Kannada', bn: 'Bengali', en: 'English',
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

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatLatency(ms: number): string {
  if (ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  const severityMax = Math.max(...Object.values(metrics.severityDistribution), 1);
  const langMax = Math.max(...Object.values(metrics.languageDistribution), 1);
  const inputTotal = metrics.inputModeDistribution.text + metrics.inputModeDistribution.voice + metrics.inputModeDistribution.voice_conversation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-teal-600 hover:text-teal-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-800">Sehat Impact Dashboard</h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Every triage = someone getting health guidance who might not have had access
            </p>
          </div>
          <div className="flex items-center gap-3">
            {metrics.isAdmin && (
              <span className="text-[10px] font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Admin</span>
            )}
            {metrics.dataSource === 'supabase' && (
              <span className="text-[10px] text-gray-400">Persistent</span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            label="Total Triages"
            value={metrics.totalTriages}
            sub={`${metrics.triagesLast24h} last 24h`}
            accent="text-teal-700"
          />
          <KPICard
            label="Emergencies"
            value={metrics.totalEmergenciesDetected}
            sub={`${metrics.emergenciesLast24h} last 24h`}
            accent="text-red-600"
          />
          <KPICard
            label="Languages"
            value={`${metrics.languagesServed}/7`}
            sub="actively used"
          />
          <KPICard
            label="Voice Usage"
            value={`${metrics.voiceUsagePercent}%`}
            sub={`${metrics.totalVoiceSessions} voice inputs`}
          />
          <KPICard
            label="Avg Response"
            value={formatLatency(metrics.performance.avgTriageMs)}
            sub={`p95: ${formatLatency(metrics.performance.p95TriageMs)}`}
          />
          <KPICard
            label="Uptime"
            value={formatDuration(metrics.uptimeMs)}
            sub={`${metrics.triagesLastHour}/hr rate`}
          />
        </div>

        {/* Middle Row: Severity + Languages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Severity Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Severity Distribution
            </h2>
            <div className="space-y-3">
              {(['emergency', 'urgent', 'routine', 'self_care'] as const).map(sev => (
                <div key={sev} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-20">
                    {SEVERITY_LABELS[sev]}
                  </span>
                  <Bar
                    value={metrics.severityDistribution[sev]}
                    max={severityMax}
                    color={SEVERITY_COLORS[sev]}
                  />
                  <span className="text-sm font-bold text-gray-700 w-8 text-right">
                    {metrics.severityDistribution[sev]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Language Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Languages Served
            </h2>
            <div className="space-y-3">
              {Object.entries(metrics.languageDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600 w-20">
                      {LANG_LABELS[lang] || lang}
                    </span>
                    <Bar value={count} max={langMax} color="bg-teal-500" />
                    <span className="text-sm font-bold text-gray-700 w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Input Mode + Voice Pipeline + Quality */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Input Mode */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Input Mode
            </h2>
            <div className="space-y-3">
              {([
                { key: 'text', label: 'Text', color: 'bg-blue-500' },
                { key: 'voice', label: 'Voice (tap)', color: 'bg-purple-500' },
                { key: 'voice_conversation', label: 'Voice Conv.', color: 'bg-teal-500' },
              ] as const).map(({ key, label, color }) => {
                const val = metrics.inputModeDistribution[key];
                const pct = inputTotal > 0 ? Math.round((val / inputTotal) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600 w-24">{label}</span>
                    <Bar value={val} max={inputTotal} color={color} />
                    <span className="text-xs text-gray-500 w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice Pipeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Voice Pipeline
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">STT Success</span>
                  <span className="font-bold text-gray-700">{metrics.voicePipeline.sttSuccessRate}%</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${metrics.voicePipeline.sttSuccessRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">TTS Success</span>
                  <span className="font-bold text-gray-700">{metrics.voicePipeline.ttsSuccessRate}%</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${metrics.voicePipeline.ttsSuccessRate}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-700">{formatLatency(metrics.performance.avgSTTMs)}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Avg STT</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-700">{formatLatency(metrics.performance.avgTTSMs)}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Avg TTS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Quality Metrics
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Avg Confidence</span>
                  <span className="font-bold text-gray-700">{metrics.quality.avgConfidence}%</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${metrics.quality.avgConfidence}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-700">{metrics.quality.followUpRate}%</p>
                  <p className="text-[10px] text-gray-400 uppercase">Follow-up Rate</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-700">{metrics.quality.nonMedicalRate}%</p>
                  <p className="text-[10px] text-gray-400 uppercase">Non-Medical</p>
                </div>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-red-600 font-medium">Error Rate</span>
                  <span className="font-bold text-red-700">{metrics.errors.triageErrorRate}%</span>
                </div>
                <p className="text-[10px] text-red-400 mt-0.5">
                  {metrics.errors.triageErrors} triage / {metrics.errors.sttErrors} STT / {metrics.errors.ttsErrors} TTS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity — visible to admins only */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
            Recent Activity
            {!metrics.isAdmin && <span className="text-[10px] text-gray-400 font-normal ml-2">(admin only)</span>}
          </h2>
          {metrics.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {metrics.isAdmin ? 'No triage sessions yet. Start a conversation to see data here.' : 'Sign in as admin to view recent activity.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase tracking-wider border-b">
                    <th className="pb-2 text-left font-medium">Time</th>
                    <th className="pb-2 text-left font-medium">Language</th>
                    <th className="pb-2 text-left font-medium">Severity</th>
                    <th className="pb-2 text-left font-medium">Input</th>
                    <th className="pb-2 text-right font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {metrics.recentActivity.map((event, i) => (
                    <tr key={i} className={event.isEmergency ? 'bg-red-50' : ''}>
                      <td className="py-2 text-gray-600">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 text-gray-700 font-medium">
                        {LANG_LABELS[event.language] || event.language}
                      </td>
                      <td className="py-2">
                        {event.severity ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${SEVERITY_COLORS[event.severity]}`}>
                            {event.isEmergency && '!!!'} {SEVERITY_LABELS[event.severity] || event.severity}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-500">
                        {event.inputMode === 'voice_conversation' ? 'Voice Conv.' :
                         event.inputMode === 'voice' ? 'Voice' : 'Text'}
                      </td>
                      <td className="py-2 text-right text-gray-600 font-mono">
                        {formatLatency(event.latencyMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-300 pb-4">
          Privacy: Zero PII stored. All metrics are aggregate counts.
          {metrics.dataSource === 'supabase' ? ' Data persisted in Supabase.' : ' Data resets on deploy.'}
        </p>
      </div>
    </div>
  );
}
