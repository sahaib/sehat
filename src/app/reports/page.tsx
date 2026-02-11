'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TriageResult as TriageResultType, Severity } from '@/types';
import { SEVERITY_CONFIG } from '@/lib/constants';

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

export default function ReportsPage() {
  const [triageReports, setTriageReports] = useState<TriageReport[]>([]);
  const [documentAnalyses, setDocumentAnalyses] = useState<DocumentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-teal-600 hover:text-teal-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-800">Medical Reports</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
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
            {/* Triage Reports */}
            {triageReports.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Triage Reports ({triageReports.length})
                </h2>
                <div className="space-y-4">
                  {triageReports.map((report) => {
                    const r = report.result_json;
                    if (!r || r.is_medical_query === false) return null;
                    const config = r.severity ? SEVERITY_CONFIG[r.severity as Severity] : null;
                    const date = new Date(report.created_at);
                    const copyText = `--- Sehat AI Triage Report ---\nDate: ${date.toLocaleDateString()}\nSeverity: ${config?.label || r.severity}\nSymptoms: ${(r.symptoms_identified || []).join(', ')}\n\nClinical Summary (English):\n${r.action_plan?.tell_doctor?.english || ''}\n\nClinical Summary (Local):\n${r.action_plan?.tell_doctor?.local || ''}\n\n--- Generated by Sehat AI Triage. Not a medical diagnosis. ---`;

                    return (
                      <div key={report.session_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {config && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${config.bgColor} ${config.textColor}`}>
                                  {config.icon} {config.label}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {r.symptoms_identified && r.symptoms_identified.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Symptoms</h4>
                              <p className="text-sm text-gray-700">{r.symptoms_identified.join(', ')}</p>
                            </div>
                          )}

                          {r.action_plan?.tell_doctor?.english && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Clinical Summary</h4>
                              <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                                {r.action_plan.tell_doctor.english}
                              </p>
                            </div>
                          )}

                          {r.action_plan?.tell_doctor?.local &&
                            r.action_plan.tell_doctor.local.trim().toLowerCase() !== r.action_plan.tell_doctor.english?.trim().toLowerCase() && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Patient Language</h4>
                              <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                                {r.action_plan.tell_doctor.local}
                              </p>
                            </div>
                          )}

                          <p className="text-xs text-gray-400 italic">AI-assisted triage — not a medical diagnosis.</p>
                        </div>

                        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
                          <button
                            onClick={() => handleCopy(copyText, report.session_id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                          >
                            {copiedId === report.session_id ? 'Copied!' : 'Copy'}
                          </button>
                          <Link
                            href={`/history/${report.session_id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            View full session
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Document Analyses */}
            {documentAnalyses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Document Analyses ({documentAnalyses.length})
                </h2>
                <div className="space-y-4">
                  {documentAnalyses.map((doc) => {
                    const date = new Date(doc.created_at);
                    return (
                      <div key={doc.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                {doc.file_type}
                              </span>
                              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{doc.file_name}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {date.toLocaleDateString()}
                            </span>
                          </div>

                          <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {doc.analysis}
                          </div>
                        </div>

                        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
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
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
