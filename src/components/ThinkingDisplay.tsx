'use client';

import { useState, useRef, useEffect } from 'react';

interface ThinkingDisplayProps {
  content: string;
  isThinking: boolean;
}

export default function ThinkingDisplay({
  content,
  isThinking,
}: ThinkingDisplayProps) {
  // Collapsed by default — most users don't need to see raw reasoning
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isThinking && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isThinking, isExpanded]);

  if (!content && !isThinking) return null;

  return (
    <div className="w-full animate-fade-in thinking-border" aria-live="polite">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-purple-600
                   hover:text-purple-700 transition-colors mb-2 w-full group"
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
      >
        {/* Brain/sparkle icon */}
        <svg
          className="w-4 h-4"
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
          {isThinking ? 'Analyzing your symptoms' : 'View AI reasoning'}
        </span>

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

      {isExpanded && (
        <div
          id="thinking-content"
          ref={contentRef}
          className="bg-purple-50/60 backdrop-blur-sm border border-purple-100/60 rounded-xl p-4
                     max-h-64 overflow-y-auto scrollbar-hide animate-scale-in"
        >
          <pre className="thinking-text whitespace-pre-wrap">
            {content || 'Starting analysis...'}
          </pre>
        </div>
      )}
    </div>
  );
}
