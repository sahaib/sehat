'use client';

import { useState } from 'react';
import { TriageResult as TriageResultType, Severity, Language } from '@/types';
import { SEVERITY_CONFIG, URGENCY_LABELS, SUPPORTED_LANGUAGES } from '@/lib/constants';
import ReadAloudButton from './ReadAloudButton';
import { inlineFormat } from './RenderMarkdown';

interface InlineTriageCardProps {
  result: TriageResultType;
  language?: Language;
}

const SEVERITY_DOT_COLORS: Record<Severity, string> = {
  emergency: 'bg-red-500',
  urgent: 'bg-orange-500',
  routine: 'bg-yellow-500',
  self_care: 'bg-green-500',
};

export default function InlineTriageCard({ result, language }: InlineTriageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[result.severity];
  const urgencyLabel = URGENCY_LABELS[result.action_plan?.urgency] || '';
  const speechCode = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.speechCode || 'en-IN';

  // Non-medical redirect — render as plain text
  if (result.is_medical_query === false) {
    return (
      <div className="chat-bubble chat-bubble-assistant">
        <p className="whitespace-pre-wrap text-base leading-relaxed">
          {result.redirect_message}
        </p>
      </div>
    );
  }

  const hasDetails =
    (result.action_plan?.first_aid?.length ?? 0) > 0 ||
    (result.red_flags?.length ?? 0) > 0 ||
    (result.action_plan?.do_not?.length ?? 0) > 0;

  return (
    <div
      className={`rounded-2xl border p-4 w-full ${config.bgColor} ${config.borderColor} transition-all duration-300`}
      role="region"
      aria-label={`Previous triage: ${config.label}`}
    >
      {/* Header row: badge + urgency */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                      ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
        >
          <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT_COLORS[result.severity]}`} />
          <span>{config.label}</span>
        </div>
        {urgencyLabel && (
          <span className={`text-xs font-semibold ${config.textColor} flex items-center gap-1`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {urgencyLabel}
          </span>
        )}
      </div>

      {/* Where to go */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/40 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Where to go</p>
        <p className="text-base font-bold text-gray-800 leading-snug">
          {inlineFormat(result.action_plan?.go_to || '')}
        </p>
      </div>

      {/* Expandable details toggle */}
      {hasDetails && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-xs font-medium transition-colors mb-1 flex items-center gap-1
                      ${expanded ? 'text-gray-500' : 'text-teal-600 hover:text-teal-700'}`}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}

      {/* Expandable section */}
      {expanded && (
        <div className="mt-2 space-y-3 animate-fade-in">
          {/* First aid */}
          {result.action_plan?.first_aid?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Immediate steps</p>
              <ol className="space-y-1">
                {result.action_plan.first_aid.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700
                                   text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{inlineFormat(step)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Red flags */}
          {result.red_flags?.length > 0 && (
            <div className="bg-white/50 rounded-lg p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">Warning signs</p>
              <ul className="space-y-0.5">
                {result.red_flags.map((flag, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">&#8226;</span>
                    <span>{inlineFormat(flag)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Do NOT */}
          {result.action_plan?.do_not?.length > 0 && (
            <div className="bg-red-50/60 rounded-lg p-2.5 border border-red-100/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">Do NOT do this</p>
              <ul className="space-y-0.5">
                {result.action_plan.do_not.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-red-400 font-bold">&#10005;</span>
                    <span>{inlineFormat(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Read aloud */}
      <div className="mt-2 flex items-center justify-between">
        <ReadAloudButton
          text={result.action_plan?.go_to || ''}
          languageCode={speechCode}
          size="sm"
        />
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">{result.disclaimer}</p>
    </div>
  );
}
