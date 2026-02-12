'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ToolStep } from '@/types';

interface ThinkingDisplayProps {
  content: string;
  isThinking: boolean;
  toolSteps?: ToolStep[];
}

const STEP_DEFINITIONS = [
  {
    id: 'symptoms',
    label: 'Symptom extraction',
    description: 'Identifying reported symptoms, duration, and intensity',
    pattern: /symptom|लक्षण|அறிகுறி|లక్షణ|लक्षणे|ರೋಗಲಕ್ಷಣ|উপসর্গ|extract|identify/i,
  },
  {
    id: 'risk',
    label: 'Patient risk profile',
    description: 'Evaluating age, pre-existing conditions, vulnerability',
    pattern: /risk|age|patient|child|elderly|pregnan|diabetes|comorbid|vulnerable/i,
  },
  {
    id: 'context',
    label: 'Retrieving context',
    description: 'Using tools to gather patient history, symptom patterns, and specialist recommendations',
    pattern: /$never_match^/, // Manually triggered by toolSteps
  },
  {
    id: 'redflags',
    label: 'Red flag screening',
    description: 'Checking for life-threatening warning signs',
    pattern: /red.?flag|emergency|cardiac|respiratory|neurolog|sepsis|anaphylax|danger|critical|आपातकाल/i,
  },
  {
    id: 'severity',
    label: 'Severity assessment',
    description: 'Applying WORST-FIRST principle to classify urgency',
    pattern: /sever|urgent|routine|self.?care|worst.?first|classif|triage|गंभीर/i,
  },
  {
    id: 'healthcare',
    label: 'Healthcare mapping',
    description: 'Matching to Indian healthcare system (PHC / District / Emergency)',
    pattern: /PHC|hospital|district|emergency|home.?care|care.?level|clinic|अस्पताल|facility/i,
  },
  {
    id: 'plan',
    label: 'Action plan',
    description: 'Building care guidance, first aid, and safety warnings',
    pattern: /action.?plan|recommend|first.?aid|do.?not|warning|remedy|सलाह|guidance|plan/i,
  },
];

// Human-readable tool descriptions
const TOOL_LABELS: Record<string, { label: string; description: string }> = {
  get_patient_history: { label: 'Patient history', description: 'Checking past triage sessions' },
  get_medication_context: { label: 'Medication context', description: 'Scanning for medication mentions' },
  analyze_symptom_patterns: { label: 'Symptom patterns', description: 'Analyzing recurrence and trends' },
  check_symptom_combinations: { label: 'Condition matching', description: 'Cross-referencing symptom clusters' },
  recommend_specialist: { label: 'Specialist', description: 'Determining appropriate specialist' },
  get_facility_type: { label: 'Facility mapping', description: 'Finding the right healthcare facility' },
  get_period_health_context: { label: 'Cycle context', description: 'Checking menstrual cycle correlation' },
  check_regional_disease_alerts: { label: 'Seasonal alerts', description: 'Checking seasonal disease patterns' },
  get_indian_health_schemes: { label: 'Health schemes', description: 'Finding applicable government schemes' },
  calculate_risk_score: { label: 'Risk score', description: 'Computing weighted risk assessment' },
  save_clinical_note: { label: 'Saving note', description: 'Recording clinical observation' },
  schedule_followup_check: { label: 'Follow-up reminder', description: 'Scheduling follow-up check' },
  update_risk_profile: { label: 'Risk profile', description: 'Updating patient risk profile' },
};

function getToolSummary(name: string, result: Record<string, unknown> | null): string | null {
  if (!result) return null;

  switch (name) {
    case 'get_patient_history': {
      const total = result.total_sessions as number;
      if (total === 0) return result.note as string || 'No past sessions';
      return `${total} past session${total > 1 ? 's' : ''} found`;
    }
    case 'analyze_symptom_patterns': {
      const recurring = result.recurring as unknown[];
      const risk = result.escalation_risk as string;
      if (!recurring?.length) return 'No recurring patterns';
      return `${recurring.length} recurring pattern${recurring.length > 1 ? 's' : ''} — ${risk} escalation risk`;
    }
    case 'check_symptom_combinations': {
      const clusters = result.possible_clusters as unknown[];
      if (!clusters?.length) return 'No known condition matches';
      return `${clusters.length} possible condition${clusters.length > 1 ? 's' : ''} identified`;
    }
    case 'recommend_specialist': {
      const spec = result.specialist as string;
      return spec ? `Recommended: ${spec}` : null;
    }
    case 'get_facility_type': {
      const level = result.facility_level as string;
      return level ? `${level} level care` : null;
    }
    case 'get_period_health_context': {
      const phase = result.phase as string;
      const related = result.is_period_related as boolean;
      if (phase && phase !== 'unknown') return `Cycle phase: ${phase}${related ? ' — may be related' : ''}`;
      return result.note as string || null;
    }
    case 'check_regional_disease_alerts': {
      const alerts = result.active_alerts as unknown[];
      if (!alerts?.length) return 'No seasonal matches';
      return `${alerts.length} seasonal alert${alerts.length > 1 ? 's' : ''}`;
    }
    case 'get_indian_health_schemes': {
      const schemes = result.applicable_schemes as unknown[];
      if (!schemes?.length) return 'No applicable schemes found';
      return `${schemes.length} scheme${schemes.length > 1 ? 's' : ''} applicable`;
    }
    case 'calculate_risk_score': {
      const score = result.risk_score as number;
      if (typeof score === 'number') return `Risk score: ${score}/100`;
      return null;
    }
    case 'get_medication_context': {
      const meds = result.mentioned_medications as unknown[];
      if (!meds?.length) return 'No medication history found';
      return `${meds.length} medication reference${meds.length > 1 ? 's' : ''}`;
    }
    case 'save_clinical_note': {
      const saved = result.saved as boolean;
      return saved ? `Note saved (${result.note_type})` : (result.note as string) || 'Note not saved';
    }
    case 'schedule_followup_check': {
      const scheduled = result.scheduled as boolean;
      return scheduled ? `Reminder set` : (result.note as string) || 'Reminder not set';
    }
    case 'update_risk_profile': {
      const updated = result.updated as boolean;
      if (!updated) return (result.note as string) || 'Profile not updated';
      const count = result.conditions_merged as number;
      return `Profile updated (${count} condition${count !== 1 ? 's' : ''})`;
    }
    default:
      return null;
  }
}

function detectActiveSteps(content: string, toolSteps: ToolStep[]): Map<string, 'completed' | 'active'> {
  const result = new Map<string, 'completed' | 'active'>();
  let lastMatch = -1;

  for (let i = 0; i < STEP_DEFINITIONS.length; i++) {
    const step = STEP_DEFINITIONS[i];

    // "Retrieving context" step — driven by toolSteps presence
    if (step.id === 'context') {
      if (toolSteps.length > 0) {
        const allDone = toolSteps.every((t) => t.status === 'done');
        result.set('context', allDone ? 'completed' : 'active');
        lastMatch = i;
      }
      continue;
    }

    if (step.pattern.test(content)) {
      result.set(step.id, 'completed');
      lastMatch = i;
    }
  }

  // The last matched step is "active" (currently being processed)
  if (lastMatch >= 0) {
    const lastId = STEP_DEFINITIONS[lastMatch].id;
    // Don't override context step state
    if (lastId !== 'context') {
      result.set(lastId, 'active');
    }
  }

  return result;
}

export default function ThinkingDisplay({
  content,
  isThinking,
  toolSteps = [],
}: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const userCollapsedRef = useRef(false);

  useEffect(() => {
    if (isThinking) {
      if (!userCollapsedRef.current) setIsExpanded(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isThinking]);

  useEffect(() => {
    if (isThinking && showRaw && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isThinking, showRaw]);

  const stepStates = useMemo(() => detectActiveSteps(content, toolSteps), [content, toolSteps]);

  if (!content && !isThinking && toolSteps.length === 0) return null;

  const completedCount = Array.from(stepStates.values()).filter(v => v === 'completed' || v === 'active').length;

  return (
    <div className="w-full animate-fade-in thinking-border" aria-live="polite">
      {/* Header toggle */}
      <button
        onClick={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          if (!next) userCollapsedRef.current = true;
          else userCollapsedRef.current = false;
        }}
        className="flex items-center gap-2 text-sm font-medium text-purple-600
                   hover:text-purple-700 transition-colors mb-2 w-full group"
        aria-expanded={isExpanded}
      >
        <svg
          className={`w-4 h-4 ${isThinking ? 'animate-pulse' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09ZM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456ZM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423Z"
          />
        </svg>

        <span>
          {isThinking
            ? toolSteps.some(s => s.status === 'running')
              ? 'Opus 4.6 agentic analysis'
              : 'Opus 4.6 medical analysis'
            : `AI reasoning (${completedCount} steps${toolSteps.length > 0 ? ` + ${toolSteps.length} tools` : ''})`
          }
        </span>

        {isThinking && elapsed > 0 && (
          <span className="text-xs text-purple-400 tabular-nums">{elapsed}s</span>
        )}

        {isThinking && (
          <span className="flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        )}

        <svg
          className={`w-4 h-4 ml-auto transition-transform duration-200 text-purple-400 group-hover:text-purple-600 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isExpanded && (
        <div className="bg-purple-50/60 backdrop-blur-sm border border-purple-100/60 rounded-xl p-4 animate-scale-in space-y-3">
          {/* Step-by-step progress */}
          <div className="space-y-2">
            {STEP_DEFINITIONS.map((step, i) => {
              const state = stepStates.get(step.id);
              const isActive = state === 'active' && isThinking;
              const isDone = state === 'completed' || (state === 'active' && !isThinking);
              const isPending = !state;

              // Context step — show tool sub-steps
              const isContextStep = step.id === 'context';
              const hasTools = isContextStep && toolSteps.length > 0;

              return (
                <div key={step.id}>
                  <div
                    className={`flex items-start gap-3 transition-all duration-500 ${
                      isPending ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    {/* Step indicator */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 transition-all duration-500 ${
                      isActive
                        ? 'bg-purple-500 ring-4 ring-purple-200 scale-110'
                        : isDone
                          ? 'bg-purple-500'
                          : 'bg-gray-200'
                    }`}>
                      {isDone && !isActive ? (
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : isActive ? (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>
                      )}
                    </div>

                    {/* Step text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-colors ${
                        isActive ? 'text-purple-700' : isDone ? 'text-purple-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                        {isActive && <span className="ml-1 text-purple-400 animate-pulse">...</span>}
                      </p>
                      {(isActive || isDone) && !hasTools && (
                        <p className="text-xs text-purple-400 mt-0.5 animate-fade-in">{step.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Tool sub-steps under "Retrieving context" */}
                  {hasTools && (
                    <div className="ml-9 mt-1.5 space-y-1.5 border-l-2 border-purple-200 pl-3">
                      {toolSteps.map((tool, ti) => {
                        const toolInfo = TOOL_LABELS[tool.name] || { label: tool.name, description: '' };
                        const isDone = tool.status === 'done';
                        const isRunning = tool.status === 'running';
                        const summary = isDone ? getToolSummary(tool.name, tool.result) : null;

                        return (
                          <div
                            key={`${tool.name}-${ti}`}
                            className={`flex items-start gap-2 transition-all duration-300 ${
                              isRunning ? 'opacity-100' : isDone ? 'opacity-90' : 'opacity-50'
                            }`}
                          >
                            {/* Tool indicator */}
                            <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center mt-0.5 ${
                              isDone ? 'bg-purple-400' : 'bg-purple-300'
                            }`}>
                              {isDone ? (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-spin-slow" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${isDone ? 'text-purple-600' : 'text-purple-500'}`}>
                                {toolInfo.label}
                                {isRunning && <span className="ml-1 text-purple-400 animate-pulse">...</span>}
                              </p>
                              {summary && (
                                <p className="text-[11px] text-purple-400 mt-0.5 animate-fade-in">{summary}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Raw reasoning toggle — for judges/developers */}
          <div className="pt-2 border-t border-purple-100/60">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-[11px] text-purple-400 hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <svg className={`w-3 h-3 transition-transform ${showRaw ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {showRaw ? 'Hide' : 'View'} raw reasoning chain
            </button>

            {showRaw && (
              <div
                ref={contentRef}
                className="mt-2 bg-purple-100/40 rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-hide"
              >
                <pre className="thinking-text whitespace-pre-wrap text-xs">
                  {content || 'Starting medical analysis...'}
                  {isThinking && <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed summary */}
      {!isThinking && content && !isExpanded && (
        <div className="flex items-center gap-2 text-xs text-purple-400">
          <span>
            {completedCount}/{STEP_DEFINITIONS.length} analysis steps completed
            {toolSteps.length > 0 && ` + ${toolSteps.length} tool${toolSteps.length > 1 ? 's' : ''} used`}
          </span>
        </div>
      )}
    </div>
  );
}
