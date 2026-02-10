'use client';

import { useState, useRef, useEffect } from 'react';
import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

interface TextInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
  language: Language;
}

export default function TextInput({
  onSubmit,
  disabled,
  language,
}: TextInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const placeholder =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.placeholder ??
    'Describe your symptoms...';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full resize-none rounded-2xl border border-gray-200 bg-white
                   pl-4 pr-12 py-3 text-gray-800 placeholder-gray-400
                   focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 text-base leading-relaxed"
        aria-label="Describe your symptoms"
      />
      {/* Send button — inside textarea, bottom-right */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !hasText}
        className={`absolute right-2 bottom-2 w-9 h-9 rounded-full
                   flex items-center justify-center transition-all duration-200
                   active:scale-90
                   ${hasText
                     ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                     : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                   }`}
        aria-label="Send message"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4.5 h-4.5"
        >
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
      </button>
    </div>
  );
}
