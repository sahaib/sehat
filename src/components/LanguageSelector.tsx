'use client';

import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  disabled,
}: LanguageSelectorProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-2">
      <div className="flex gap-2 min-w-max px-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              disabled={disabled}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                whitespace-nowrap min-h-[44px]
                ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-md scale-105'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:text-teal-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              `}
              aria-label={`Select ${lang.label}`}
              aria-pressed={isSelected}
            >
              <span className="block font-semibold">{lang.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
