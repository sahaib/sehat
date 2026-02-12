'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { TriageResult as TriageResultType, Severity } from '@/types';
import { SEVERITY_CONFIG, URGENCY_LABELS, SUPPORTED_LANGUAGES } from '@/lib/constants';
import RenderMarkdown from '@/components/RenderMarkdown';
import AppShell from '@/components/AppShell';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateReportPDF(r: TriageResultType, date: Date, language: string): void {
  const config = r.severity ? SEVERITY_CONFIG[r.severity as Severity] : null;
  const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label || 'English';
  const timestamp = date.toLocaleString();
  const refId = `SHT-${date.getTime().toString(36).toUpperCase().slice(-6)}`;
  const sevColor = config?.color || '#6b7280';
  const sevBg = { emergency: '#FEF2F2', urgent: '#FFF7ED', routine: '#FEFCE8', self_care: '#F0FDF4' }[r.severity] || '#F9FAFB';

  const hasDoctorLocal = r.action_plan?.tell_doctor?.local &&
    r.action_plan.tell_doctor.local.trim().toLowerCase() !== r.action_plan.tell_doctor.english?.trim().toLowerCase();

  const sections: string[] = [];

  if (r.symptoms_identified?.length) {
    sections.push(`<div class="section"><h3>Reported Symptoms</h3><p>${r.symptoms_identified.map((s) => `<span class="tag">${esc(s)}</span>`).join(' ')}</p></div>`);
  }
  if (r.action_plan?.tell_doctor?.english) {
    sections.push(`<div class="section"><h3>${hasDoctorLocal ? 'Clinical Summary (English)' : 'Clinical Summary'}</h3><div class="summary-box">${esc(r.action_plan.tell_doctor.english)}</div></div>`);
  }
  if (hasDoctorLocal) {
    sections.push(`<div class="section"><h3>Clinical Summary (${esc(langLabel)})</h3><div class="summary-box">${esc(r.action_plan.tell_doctor.local)}</div></div>`);
  }
  if (r.action_plan?.go_to) {
    sections.push(`<div class="section"><h3>Where to Go</h3><p style="font-size:14px;font-weight:600;">${esc(r.action_plan.go_to)}</p></div>`);
  }
  if (r.action_plan?.first_aid?.length) {
    sections.push(`<div class="section"><h3>Immediate Steps</h3><ol>${r.action_plan.first_aid.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`);
  }
  if (r.red_flags?.length) {
    sections.push(`<div class="section warning-box"><h3 style="color:#DC2626;">Warning Signs</h3><ul>${r.red_flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>`);
  }
  if (r.action_plan?.do_not?.length) {
    sections.push(`<div class="section danger-box"><h3 style="color:#DC2626;">Do NOT Do This</h3><ul>${r.action_plan.do_not.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>`);
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sehat Report — ${refId}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;color:#1f2937;padding:32px 40px;max-width:800px;margin:0 auto;line-height:1.5}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:20px}.header h1{font-size:22px;font-weight:700;color:#0d9488}.header .subtitle{font-size:12px;color:#9ca3af;margin-top:2px}.header .meta{text-align:right;font-size:11px;color:#9ca3af}.severity-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;margin-bottom:20px;background:${sevBg};border-left:4px solid ${sevColor}}.severity-bar .badge{font-size:15px;font-weight:700;color:${sevColor}}.severity-bar .urgency{margin-left:auto;font-size:12px;font-weight:600;color:#6b7280}.section{margin-bottom:16px}.section h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:6px}.section p,.section li{font-size:13px;color:#374151}.section ol,.section ul{padding-left:20px}.section li{margin-bottom:4px}.summary-box{background:#f9fafb;border-radius:8px;padding:12px 14px;font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap}.tag{display:inline-block;background:#f3f4f6;border-radius:12px;padding:2px 10px;font-size:12px;margin:2px 3px 2px 0;color:#4b5563}.warning-box,.danger-box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;font-style:italic;line-height:1.5}@media print{body{padding:20px 24px}}</style></head>
<body><div class="header"><div><h1>Sehat AI Triage Report</h1><div class="subtitle">AI-Assisted Medical Triage Summary</div></div><div class="meta"><div>Ref: ${esc(refId)}</div><div>${esc(timestamp)}</div></div></div>
<div class="severity-bar"><span class="badge">${esc(config?.icon || '')} ${esc(config?.label || r.severity)}</span><span class="urgency">${esc(r.action_plan?.urgency?.replace(/_/g, ' ') || '')}</span></div>
${sections.join('\n')}
<div class="footer">AI-assisted triage — not a medical diagnosis. Generated by Sehat on ${esc(timestamp)}. Please consult a qualified healthcare provider. In emergency, call 112.</div></body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => { win.focus(); win.print(); }, 300);
}

interface TriageReport {
  session_id: string;
  result_json: TriageResultType;
  language: string;
  created_at: string;
}

interface DocumentAnalysis {
  id: string;
  file_name: string;
  file_type: string;
  analysis: string;
  language: string;
  created_at: string;
}

type FilterType = 'all' | Severity;

function RelativeDate({ date }: { date: Date }) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMins < 1) relative = 'Just now';
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHrs < 24) relative = `${diffHrs}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = date.toLocaleDateString();

  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()} className="text-xs text-gray-400">
      {relative}
    </time>
  );
}

function TriageCard({ report, copiedId, onCopy }: {
  report: TriageReport;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const r = report.result_json;
  if (!r || r.is_medical_query === false) return null;

  const config = r.severity ? SEVERITY_CONFIG[r.severity as Severity] : null;
  const date = new Date(report.created_at);
  const urgencyLabel = URGENCY_LABELS[r.action_plan?.urgency] || '';
  const severityColor = config?.color || '#6b7280';

  const hasDoctorLocal = r.action_plan?.tell_doctor?.local &&
    r.action_plan.tell_doctor.local.trim().toLowerCase() !== r.action_plan.tell_doctor.english?.trim().toLowerCase();

  const copyText = `--- Sehat AI Triage Report ---\nDate: ${date.toLocaleDateString()}\nSeverity: ${config?.label || r.severity}\nSymptoms: ${(r.symptoms_identified || []).join(', ')}\n\nClinical Summary (English):\n${r.action_plan?.tell_doctor?.english || ''}\n${hasDoctorLocal ? `\nClinical Summary (Local):\n${r.action_plan.tell_doctor.local}\n` : ''}\n--- Generated by Sehat AI Triage. Not a medical diagnosis. ---`;

  return (
    <div
      className="card-clinical overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{ borderLeftWidth: 4, borderLeftColor: severityColor }}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
      >
        {/* Severity icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ backgroundColor: `${severityColor}15` }}
        >
          {config?.icon || '?'}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {config && (
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: severityColor }}
              >
                {config.label}
              </span>
            )}
            {urgencyLabel && (
              <span className="text-xs text-gray-400">{urgencyLabel}</span>
            )}
          </div>

          {/* Symptoms as tags */}
          {r.symptoms_identified && r.symptoms_identified.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {r.symptoms_identified.slice(0, 4).map((s, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
              {r.symptoms_identified.length > 4 && (
                <span className="text-xs text-gray-400">+{r.symptoms_identified.length - 4} more</span>
              )}
            </div>
          )}

          {/* Where to go — key info at glance */}
          {r.action_plan?.go_to && (
            <p className="text-sm text-gray-600 mt-1 truncate">{r.action_plan.go_to}</p>
          )}
        </div>

        {/* Date + expand chevron */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <RelativeDate date={date} />
          <svg
            className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-slide-up">
          {/* Clinical Summary (English) */}
          {r.action_plan?.tell_doctor?.english && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Clinical Summary</h4>
              <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                <RenderMarkdown text={r.action_plan.tell_doctor.english} />
              </div>
            </div>
          )}

          {/* Clinical Summary (Local) */}
          {hasDoctorLocal && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Patient Language</h4>
              <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                <RenderMarkdown text={r.action_plan.tell_doctor.local} />
              </div>
            </div>
          )}

          {/* Red flags */}
          {r.red_flags && r.red_flags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Warning Signs</h4>
              <ul className="space-y-0.5">
                {r.red_flags.map((f, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">&#8226;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* First aid */}
          {r.action_plan?.first_aid && r.action_plan.first_aid.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Immediate Steps</h4>
              <ol className="space-y-0.5">
                {r.action_plan.first_aid.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold text-xs mt-0.5">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Do NOT */}
          {r.action_plan?.do_not && r.action_plan.do_not.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Do NOT</h4>
              <ul className="space-y-0.5">
                {r.action_plan.do_not.map((d, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-red-400 font-bold">&#10005;</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 italic pt-1">AI-assisted triage — not a medical diagnosis.</p>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(copyText, report.session_id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              {copiedId === report.session_id ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); generateReportPDF(r, date, report.language); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export PDF
            </button>
            <Link
              href={`/history/${report.session_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View session
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [triageReports, setTriageReports] = useState<TriageReport[]>([]);
  const [documentAnalyses, setDocumentAnalyses] = useState<DocumentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [tab, setTab] = useState<'triage' | 'documents'>('triage');

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/reports');
        if (res.status === 401) {
          setError('sign-in');
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setTriageReports(data.triageReports);
        setDocumentAnalyses(data.documentAnalyses);
      } catch {
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Count by severity for filter pills
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const r of triageReports) {
      if (!r.result_json || r.result_json.is_medical_query === false) continue;
      counts.all++;
      const sev = r.result_json.severity;
      if (sev) counts[sev] = (counts[sev] || 0) + 1;
    }
    return counts;
  }, [triageReports]);

  const filteredReports = useMemo(() => {
    if (filter === 'all') return triageReports;
    return triageReports.filter((r) => r.result_json?.severity === filter);
  }, [triageReports, filter]);

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
        <h2 className="text-xl font-bold text-gray-700">Sign in to view reports</h2>
        <p className="text-gray-400 text-center max-w-sm">Your medical reports are saved when you&apos;re signed in.</p>
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

  const isEmpty = triageReports.length === 0 && documentAnalyses.length === 0;

  return (
    <AppShell title="Reports">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Tabs */}
        {!isEmpty && (
          <div className="flex gap-1">
            <button
              onClick={() => setTab('triage')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'triage'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Triage ({severityCounts.all || 0})
            </button>
            {documentAnalyses.length > 0 && (
              <button
                onClick={() => setTab('documents')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'documents'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Documents ({documentAnalyses.length})
              </button>
            )}
          </div>
        )}
        {isEmpty ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-400">No reports yet</p>
            <Link href="/" className="inline-block px-5 py-2 bg-teal-600 text-white text-sm rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Start a triage
            </Link>
          </div>
        ) : (
          <>
            {/* Triage Reports Tab */}
            {tab === 'triage' && (
              <>
                {/* Severity filter pills */}
                {severityCounts.all > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'emergency', 'urgent', 'routine', 'self_care'] as FilterType[]).map((f) => {
                      const count = f === 'all' ? severityCounts.all : (severityCounts[f] || 0);
                      if (count === 0 && f !== 'all') return null;
                      const cfg = f !== 'all' ? SEVERITY_CONFIG[f] : null;
                      return (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                            filter === f
                              ? cfg
                                ? 'text-white'
                                : 'bg-gray-700 text-white'
                              : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                          }`}
                          style={filter === f && cfg ? { backgroundColor: cfg.color } : undefined}
                        >
                          {f === 'all' ? 'All' : cfg?.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Report cards */}
                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <TriageCard
                      key={report.session_id}
                      report={report}
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  ))}
                  {filteredReports.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No reports matching this filter.</p>
                  )}
                </div>
              </>
            )}

            {/* Documents Tab */}
            {tab === 'documents' && (
              <div className="space-y-3">
                {documentAnalyses.map((doc) => {
                  const date = new Date(doc.created_at);
                  return (
                    <div key={doc.id} className="card-clinical overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4.5 h-4.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{doc.file_name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-600 capitalize font-medium">{doc.file_type}</span>
                                <RelativeDate date={date} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed max-h-60 overflow-y-auto">
                          <RenderMarkdown text={doc.analysis} />
                        </div>
                      </div>

                      <div className="flex gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => handleCopy(doc.analysis, doc.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          {copiedId === doc.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
