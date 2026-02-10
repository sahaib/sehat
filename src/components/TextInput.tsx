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

  return (
    <div className="flex items-end gap-2 w-full">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3
                     text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-400
                     focus:ring-2 focus:ring-teal-100 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 text-base leading-relaxed"
          aria-label="Describe your symptoms"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="flex-shrink-0 w-12 h-12 rounded-full bg-teal-600 text-white
                   flex items-center justify-center hover:bg-teal-700
                   transition-all duration-200 active:scale-95
                   disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
      </button>
    </div>
  );
}
