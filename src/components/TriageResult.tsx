'use client';

import { TriageResult as TriageResultType, Severity, Language, NearbyHospital } from '@/types';
import { SEVERITY_CONFIG, URGENCY_LABELS, SUPPORTED_LANGUAGES } from '@/lib/constants';
import ReadAloudButton from './ReadAloudButton';
import NearbyHospitals from './NearbyHospitals';
import { inlineFormat } from './RenderMarkdown';

interface TriageResultProps {
  result: TriageResultType;
  language?: Language;
  nearbyHospitals?: NearbyHospital[];
}

const SEVERITY_DOT_COLORS: Record<Severity, string> = {
  emergency: 'bg-red-500',
  urgent: 'bg-orange-500',
  routine: 'bg-yellow-500',
  self_care: 'bg-green-500',
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold
                  ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
      role="status"
      aria-label={`Severity: ${config.label}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${SEVERITY_DOT_COLORS[severity]}`} aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="section-label">Confidence</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-32" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-medium text-gray-700 tabular-nums">{percent}%</span>
    </div>
  );
}

export default function TriageResult({ result, language, nearbyHospitals }: TriageResultProps) {
  const config = SEVERITY_CONFIG[result.severity];
  const urgencyLabel = URGENCY_LABELS[result.action_plan.urgency] || result.action_plan.urgency;

  const actionPlanText = [
    result.action_plan.go_to,
    ...result.action_plan.first_aid,
  ].join('. ');

  const speechCode = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.speechCode || 'en-IN';

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
      {/* Header: Severity + Urgency in a row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <SeverityBadge severity={result.severity} />
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${config.textColor}`}>
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{urgencyLabel}</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <ConfidenceBar confidence={result.confidence} />
      </div>

      {/* Primary action card: Where to go */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 mb-4">
        <h3 className="section-label mb-1.5">Where to go</h3>
        <p className="text-xl font-bold text-gray-800">{inlineFormat(result.action_plan.go_to)}</p>

        {/* Emergency numbers inside the primary card */}
        {showEmergencyNumbers && (
          <div className="flex gap-2 mt-3">
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
      </div>

      {/* Nearby hospitals */}
      {nearbyHospitals && nearbyHospitals.length > 0 && (
        <NearbyHospitals hospitals={nearbyHospitals} />
      )}

      {/* First aid */}
      {result.action_plan.first_aid.length > 0 && (
        <div className="mb-4">
          <h3 className="section-label mb-2">Immediate steps</h3>
          <ol className="space-y-1.5">
            {result.action_plan.first_aid.map((step, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700
                               text-sm font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-base">{inlineFormat(step)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Section divider */}
      {result.red_flags.length > 0 && <div className="divider-section mb-4" />}

      {/* Warning signs / red flags */}
      {result.red_flags.length > 0 && (
        <div className="mb-4 bg-white/50 rounded-xl p-3">
          <h3 className="section-label text-emergency-700 mb-2 flex items-center gap-1">
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
                <span>{inlineFormat(flag)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section divider */}
      {result.action_plan.do_not.length > 0 && <div className="divider-section mb-4" />}

      {/* Do NOT do this */}
      {result.action_plan.do_not.length > 0 && (
        <div className="mb-4 bg-emergency-50 border border-emergency-200 rounded-xl p-3">
          <h3 className="section-label text-emergency-700 mb-2">Do NOT do this</h3>
          <ul className="space-y-1">
            {result.action_plan.do_not.map((item, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-emergency-500 font-bold" aria-hidden="true">&#10005;</span>
                <span>{inlineFormat(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Read aloud button */}
      <div className="mt-2">
        <ReadAloudButton text={actionPlanText} languageCode={speechCode} size="sm" />
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-gray-200/50">
        <p className="text-xs text-gray-400 leading-relaxed">{result.disclaimer}</p>
      </div>
    </div>
  );
}
