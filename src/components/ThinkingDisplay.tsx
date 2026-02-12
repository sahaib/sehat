'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface ThinkingDisplayProps {
  content: string;
  isThinking: boolean;
}

interface ReasoningStep {
  id: string;
  label: string;
  description: string;
  pattern: RegExp;
  active: boolean;
  completed: boolean;
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
    id: 'context',
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

function detectActiveSteps(content: string): Map<string, 'completed' | 'active'> {
  const result = new Map<string, 'completed' | 'active'>();
  let lastMatch = -1;

  for (let i = 0; i < STEP_DEFINITIONS.length; i++) {
    if (STEP_DEFINITIONS[i].pattern.test(content)) {
      result.set(STEP_DEFINITIONS[i].id, 'completed');
      lastMatch = i;
    }
  }

  // The last matched step is "active" (currently being processed)
  if (lastMatch >= 0) {
    result.set(STEP_DEFINITIONS[lastMatch].id, 'active');
  }

  return result;
}

export default function ThinkingDisplay({
  content,
  isThinking,
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

  const stepStates = useMemo(() => detectActiveSteps(content), [content]);

  if (!content && !isThinking) return null;

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
            ? `Opus 4.6 medical analysis`
            : `AI reasoning (${completedCount} steps)`
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
          {/* Step-by-step progress — clean view */}
          <div className="space-y-2">
            {STEP_DEFINITIONS.map((step, i) => {
              const state = stepStates.get(step.id);
              const isActive = state === 'active' && isThinking;
              const isDone = state === 'completed' || (state === 'active' && !isThinking);
              const isPending = !state;

              return (
                <div
                  key={step.id}
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
                    {(isActive || isDone) && (
                      <p className="text-xs text-purple-400 mt-0.5 animate-fade-in">{step.description}</p>
                    )}
                  </div>
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
          <span>{completedCount}/{STEP_DEFINITIONS.length} analysis steps completed</span>
        </div>
      )}
    </div>
  );
}
