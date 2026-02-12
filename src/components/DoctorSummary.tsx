'use client';

import { useState } from 'react';
import {
  DoctorSummary as DoctorSummaryType,
  Severity,
  Language,
  TriageResult as TriageResultType,
} from '@/types';
import { SEVERITY_CONFIG, SUPPORTED_LANGUAGES } from '@/lib/constants';

type ExportLang = 'english' | 'local' | 'bilingual';

interface DoctorSummaryProps {
  summary: DoctorSummaryType;
  severity: Severity;
  symptoms: string[];
  result?: TriageResultType;
  language?: Language;
}

function generateRefId(): string {
  return `SHT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function getLanguageLabel(lang?: Language): string {
  if (!lang || lang === 'en') return 'English';
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.label ?? 'English';
}

function getSeverityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    emergency: '#DC2626',
    urgent: '#EA580C',
    routine: '#CA8A04',
    self_care: '#16A34A',
  };
  return colors[severity];
}

function getSeverityBg(severity: Severity): string {
  const colors: Record<Severity, string> = {
    emergency: '#FEF2F2',
    urgent: '#FFF7ED',
    routine: '#FEFCE8',
    self_care: '#F0FDF4',
  };
  return colors[severity];
}

/**
 * Builds a complete, self-contained HTML document for the PDF export.
 * Opens in a new window and triggers print.
 */
function generatePrintHTML(
  props: DoctorSummaryProps,
  exportLang: ExportLang,
  refId: string
): string {
  const { summary, severity, symptoms, result, language } = props;
  const config = SEVERITY_CONFIG[severity];
  const timestamp = new Date().toLocaleString();
  const langLabel = getLanguageLabel(language);
  const sevColor = getSeverityColor(severity);
  const sevBg = getSeverityBg(severity);
  const isEnglish = language === 'en' || !language;
  const isDuplicate = summary.english.trim().toLowerCase() === summary.local.trim().toLowerCase();

  // Decide which clinical summaries to show
  const showEnglish = exportLang === 'english' || exportLang === 'bilingual';
  const showLocal = (exportLang === 'local' || exportLang === 'bilingual') && !isDuplicate && !isEnglish;

  // Build sections
  const sections: string[] = [];

  // Symptoms
  if (symptoms.length > 0) {
    sections.push(`
      <div class="section">
        <h3>Reported Symptoms</h3>
        <p>${symptoms.map((s) => `<span class="tag">${esc(s)}</span>`).join(' ')}</p>
      </div>
    `);
  }

  // Clinical summary
  if (showEnglish) {
    const label = showLocal ? 'Clinical Summary (English)' : 'Clinical Summary';
    sections.push(`
      <div class="section">
        <h3>${label}</h3>
        <div class="summary-box">${esc(summary.english)}</div>
      </div>
    `);
  }
  if (showLocal) {
    sections.push(`
      <div class="section">
        <h3>Clinical Summary (${esc(langLabel)})</h3>
        <div class="summary-box">${esc(summary.local)}</div>
      </div>
    `);
  }

  // Full action plan (if result is available)
  if (result) {
    // Where to go
    if (result.action_plan.go_to) {
      sections.push(`
        <div class="section">
          <h3>Where to Go</h3>
          <p style="font-size:14px;font-weight:600;">${esc(result.action_plan.go_to)}</p>
        </div>
      `);
    }

    // First aid
    if (result.action_plan.first_aid.length > 0) {
      sections.push(`
        <div class="section">
          <h3>Immediate Steps</h3>
          <ol>${result.action_plan.first_aid.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        </div>
      `);
    }

    // Red flags
    if (result.red_flags.length > 0) {
      sections.push(`
        <div class="section warning-box">
          <h3 style="color:#DC2626;">Warning Signs</h3>
          <ul>${result.red_flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        </div>
      `);
    }

    // Do NOT
    if (result.action_plan.do_not.length > 0) {
      sections.push(`
        <div class="section danger-box">
          <h3 style="color:#DC2626;">Do NOT Do This</h3>
          <ul>${result.action_plan.do_not.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        </div>
      `);
    }

    // Emergency numbers
    if (
      (severity === 'emergency' || severity === 'urgent') &&
      result.action_plan.emergency_numbers &&
      result.action_plan.emergency_numbers.length > 0
    ) {
      sections.push(`
        <div class="section">
          <h3>Emergency Numbers</h3>
          <p style="font-size:18px;font-weight:700;color:#DC2626;">
            ${result.action_plan.emergency_numbers.map((n) => `${esc(n)}`).join(' &nbsp;|&nbsp; ')}
          </p>
        </div>
      `);
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sehat Triage Report — ${refId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1f2937;
      padding: 32px 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0d9488;
    }
    .header .subtitle {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 2px;
    }
    .header .meta {
      text-align: right;
      font-size: 11px;
      color: #9ca3af;
    }
    .severity-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      background: ${sevBg};
      border-left: 4px solid ${sevColor};
    }
    .severity-bar .badge {
      font-size: 15px;
      font-weight: 700;
      color: ${sevColor};
    }
    .severity-bar .urgency {
      margin-left: auto;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
    }
    .section {
      margin-bottom: 16px;
    }
    .section h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .section p, .section li {
      font-size: 13px;
      color: #374151;
    }
    .section ol, .section ul {
      padding-left: 20px;
    }
    .section li {
      margin-bottom: 4px;
    }
    .summary-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .tag {
      display: inline-block;
      background: #f3f4f6;
      border-radius: 12px;
      padding: 2px 10px;
      font-size: 12px;
      margin: 2px 3px 2px 0;
      color: #4b5563;
    }
    .warning-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .danger-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
      font-style: italic;
      line-height: 1.5;
    }
    @media print {
      body { padding: 20px 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Sehat AI Triage Report</h1>
      <div class="subtitle">AI-Assisted Medical Triage Summary</div>
    </div>
    <div class="meta">
      <div>Ref: ${esc(refId)}</div>
      <div>${esc(timestamp)}</div>
      ${language && language !== 'en' ? `<div>Language: ${esc(langLabel)}</div>` : ''}
    </div>
  </div>

  <div class="severity-bar">
    <span class="badge">${esc(config.icon)} ${esc(config.label)}</span>
    ${result ? `<span class="urgency">${esc(result.action_plan.urgency.replace(/_/g, ' '))}</span>` : ''}
  </div>

  ${sections.join('\n')}

  <div class="footer">
    AI-assisted triage — not a medical diagnosis. Generated by Sehat on ${esc(timestamp)}.
    Please consult a qualified healthcare provider for proper evaluation and treatment. In emergency, call 112.
  </div>
</body>
</html>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function DoctorSummary({
  summary,
  severity,
  symptoms,
  result,
  language,
}: DoctorSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [exportLang, setExportLang] = useState<ExportLang>('bilingual');
  const config = SEVERITY_CONFIG[severity];
  const [refId] = useState(generateRefId);
  const timestamp = new Date().toLocaleString();

  const isEnglish = language === 'en' || !language;
  const isDuplicate =
    summary.english.trim().toLowerCase() === summary.local.trim().toLowerCase();
  const langLabel = getLanguageLabel(language);

  // Show language selector only when there's a distinct local language
  const showLangSelector = !isEnglish && !isDuplicate;

  const handleCopy = async () => {
    const showEn = exportLang === 'english' || exportLang === 'bilingual' || !showLangSelector;
    const showLocal = (exportLang === 'local' || exportLang === 'bilingual') && showLangSelector;

    let text = `--- Sehat AI Triage Report ---\nRef: ${refId} | ${timestamp}\nSeverity: ${config.label}\nSymptoms: ${symptoms.join(', ')}\n`;
    if (showEn) text += `\nClinical Summary${showLocal ? ' (English)' : ''}:\n${summary.english}\n`;
    if (showLocal) text += `\nClinical Summary (${langLabel}):\n${summary.local}\n`;
    if (result) {
      if (result.action_plan.go_to) text += `\nWhere to go: ${result.action_plan.go_to}\n`;
      if (result.action_plan.first_aid.length > 0) text += `\nImmediate steps:\n${result.action_plan.first_aid.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n`;
      if (result.action_plan.do_not.length > 0) text += `\nDo NOT:\n${result.action_plan.do_not.map((s) => `  - ${s}`).join('\n')}\n`;
    }
    text += `\n--- Generated by Sehat AI Triage. Not a medical diagnosis. ---`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    const html = generatePrintHTML(
      { summary, severity, symptoms, result, language },
      showLangSelector ? exportLang : 'english',
      refId
    );
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    // Wait for content to render before printing
    win.onload = () => {
      win.focus();
      win.print();
    };
    // Fallback for browsers where onload doesn't fire
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };

  return (
    <div className="doctor-summary w-full card-clinical overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-teal-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <h3 className="font-semibold text-gray-700">Doctor Summary</h3>
        <span className="text-xs text-gray-400 ml-auto">Show this to your doctor</span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Severity badge + ref */}
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
            <span aria-hidden="true">{config.icon}</span> {config.label}
          </div>
          <span className="text-[10px] text-gray-300 font-mono">{refId}</span>
        </div>

        {/* Symptoms */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Reported Symptoms
          </h4>
          <p className="text-sm text-gray-700">{symptoms.join(', ')}</p>
        </div>

        {/* English summary (always shown) */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {isDuplicate || isEnglish ? 'Clinical Summary' : 'Clinical Summary (English)'}
          </h4>
          <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-3">
            {summary.english}
          </p>
        </div>

        {/* Local language summary — only shown when different */}
        {!isDuplicate && !isEnglish && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Clinical Summary ({langLabel})
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-3">
              {summary.local}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400 italic">
            AI-assisted triage — not a medical diagnosis. Generated by Sehat on {timestamp}.
            Please consult a qualified healthcare provider for proper evaluation and treatment.
          </p>
        </div>
      </div>

      {/* Export language selector + action buttons */}
      <div className="flex flex-col gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50">
        {/* Language selector — only when there are two distinct languages */}
        {showLangSelector && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Export in:</span>
            <div className="flex gap-1">
              {[
                { value: 'bilingual' as ExportLang, label: 'Bilingual' },
                { value: 'english' as ExportLang, label: 'English' },
                { value: 'local' as ExportLang, label: langLabel },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExportLang(opt.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    exportLang === opt.value
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-teal-700
                       bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
