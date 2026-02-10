'use client';

import { TriageResult as TriageResultType, Severity, Language } from '@/types';
import { SEVERITY_CONFIG, URGENCY_LABELS, SUPPORTED_LANGUAGES } from '@/lib/constants';

interface TriageResultProps {
  result: TriageResultType;
  language?: Language;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg
                  ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
      role="status"
      aria-label={`Severity: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span>Confidence:</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-32" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-medium text-gray-700">{percent}%</span>
    </div>
  );
}

function speakText(text: string, langCode: string = 'en-IN') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

export default function TriageResult({ result, language }: TriageResultProps) {
  const config = SEVERITY_CONFIG[result.severity];
  const urgencyLabel = URGENCY_LABELS[result.action_plan.urgency] || result.action_plan.urgency;

  const actionPlanText = [
    result.action_plan.go_to,
    ...result.action_plan.first_aid,
  ].join('. ');

  // Get the correct speech code for the selected language
  const speechCode = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.speechCode || 'en-IN';

  // Only show emergency numbers for emergency and urgent severity
  const showEmergencyNumbers =
    (result.severity === 'emergency' || result.severity === 'urgent') &&
    result.action_plan.emergency_numbers &&
    result.action_plan.emergency_numbers.length > 0;

  return (
    <div
      className={`severity-card ${config.bgColor} ${config.borderColor} w-full`}
      role="region"
      aria-label={`Triage result: ${config.label}`}
      aria-live="polite"
    >
      {/* Header: Severity + Confidence */}
      <div className="flex flex-col gap-3 mb-4">
        <SeverityBadge severity={result.severity} />
        <ConfidenceBar confidence={result.confidence} />
      </div>

      {/* Urgency timeframe */}
      <div className={`text-base font-semibold ${config.textColor} mb-4 flex items-center gap-2`}>
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {urgencyLabel}
      </div>

      {/* Where to go */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Where to go
        </h3>
        <p className="text-lg font-medium text-gray-800">{result.action_plan.go_to}</p>
      </div>

      {/* Emergency numbers — ONLY for emergency/urgent */}
      {showEmergencyNumbers && (
        <div className="flex gap-2 mb-4">
          {result.action_plan.emergency_numbers!.map((num) => (
            <a
              key={num}
              href={`tel:${num}`}
              className="flex items-center gap-2 px-4 py-2 bg-emergency-600 text-white
                         rounded-xl font-bold text-lg active:scale-95 transition-transform
                         shadow-md hover:bg-emergency-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  clipRule="evenodd"
                />
              </svg>
              {num}
            </a>
          ))}
        </div>
      )}

      {/* First aid */}
      {result.action_plan.first_aid.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Immediate steps
          </h3>
          <ol className="space-y-1.5">
            {result.action_plan.first_aid.map((step, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700
                               text-sm font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-base">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Warning signs / red flags */}
      {result.red_flags.length > 0 && (
        <div className="mb-4 bg-white/50 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-emergency-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
            Warning signs
          </h3>
          <ul className="space-y-1">
            {result.red_flags.map((flag, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-emergency-500 mt-1" aria-hidden="true">&#8226;</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Do NOT do this */}
      {result.action_plan.do_not.length > 0 && (
        <div className="mb-4 bg-emergency-50 border border-emergency-200 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-emergency-700 uppercase tracking-wide mb-2">
            Do NOT do this
          </h3>
          <ul className="space-y-1">
            {result.action_plan.do_not.map((item, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-emergency-500 font-bold" aria-hidden="true">&#10005;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Read aloud button */}
      <button
        onClick={() => speakText(actionPlanText, speechCode)}
        className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700
                   font-medium transition-colors mt-2 active:scale-95"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
          <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
        </svg>
        Read aloud
      </button>

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-gray-200/50">
        <p className="text-xs text-gray-400 leading-relaxed">{result.disclaimer}</p>
      </div>
    </div>
  );
}
