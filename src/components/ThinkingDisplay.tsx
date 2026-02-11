'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface ThinkingDisplayProps {
  content: string;
  isThinking: boolean;
}

// Detect reasoning steps from thinking content
function detectSteps(content: string): string[] {
  const steps: string[] = [];
  const patterns = [
    { re: /symptom|लक्षण|அறிகுறி/i, label: 'Identifying symptoms' },
    { re: /red.?flag|emergency|आपातकाल|danger/i, label: 'Screening red flags' },
    { re: /sever|urgent|triage|गंभीर/i, label: 'Assessing severity' },
    { re: /follow.?up|question|clarif/i, label: 'Considering follow-up' },
    { re: /action.?plan|recommend|सलाह|care.?level/i, label: 'Forming action plan' },
    { re: /doctor|hospital|PHC|clinic|अस्पताल/i, label: 'Determining care level' },
  ];
  for (const p of patterns) {
    if (p.re.test(content)) steps.push(p.label);
  }
  return steps;
}

export default function ThinkingDisplay({
  content,
  isThinking,
}: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  // Track whether user explicitly collapsed — respect their preference
  const userCollapsedRef = useRef(false);

  // Auto-expand when thinking starts (unless user explicitly collapsed), track elapsed time
  useEffect(() => {
    if (isThinking) {
      // Only auto-expand if user hasn't manually collapsed this session
      if (!userCollapsedRef.current) {
        setIsExpanded(true);
      }
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

  // Auto-scroll when content updates
  useEffect(() => {
    if (isThinking && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isThinking, isExpanded]);

  const steps = useMemo(() => detectSteps(content), [content]);

  if (!content && !isThinking) return null;

  return (
    <div className="w-full animate-fade-in thinking-border" aria-live="polite">
      <button
        onClick={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          // Track user intent — if they collapse, don't auto-expand again
          if (!next) userCollapsedRef.current = true;
          else userCollapsedRef.current = false;
        }}
        className="flex items-center gap-2 text-sm font-medium text-purple-600
                   hover:text-purple-700 transition-colors mb-2 w-full group"
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
      >
        {/* Brain/sparkle icon */}
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
          {isThinking ? 'Opus 4.6 analyzing symptoms' : 'View AI reasoning'}
        </span>

        {/* Elapsed time */}
        {isThinking && elapsed > 0 && (
          <span className="text-xs text-purple-400 tabular-nums">{elapsed}s</span>
        )}

        {/* Thinking dots animation */}
        {isThinking && (
          <span className="flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        )}

        {/* Expand/collapse chevron */}
        <svg
          className={`w-4 h-4 ml-auto transition-transform duration-200 text-purple-400 group-hover:text-purple-600 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Reasoning step badges */}
      {isExpanded && steps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {steps.map((step, i) => (
            <span
              key={step}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                         bg-purple-100/60 text-purple-700 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              {step}
            </span>
          ))}
        </div>
      )}

      {isExpanded && (
        <div
          id="thinking-content"
          ref={contentRef}
          className="bg-purple-50/60 backdrop-blur-sm border border-purple-100/60 rounded-xl p-4
                     max-h-64 overflow-y-auto scrollbar-hide animate-scale-in"
        >
          <pre className="thinking-text whitespace-pre-wrap">
            {content || 'Starting medical analysis...'}
            {isThinking && <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />}
          </pre>
        </div>
      )}

      {/* Completed summary */}
      {!isThinking && content && !isExpanded && (
        <p className="text-xs text-purple-400 truncate">
          {content.slice(0, 120)}...
        </p>
      )}
    </div>
  );
}
