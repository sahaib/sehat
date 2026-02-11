'use client';

import { useState, useRef } from 'react';
import { Language } from '@/types';

interface FileUploadProps {
  language: Language;
  disabled: boolean;
}

const LABELS: Record<Language, { upload: string; analyzing: string }> = {
  hi: { upload: 'रिपोर्ट अपलोड करें', analyzing: 'विश्लेषण हो रहा है...' },
  en: { upload: 'Upload report', analyzing: 'Analyzing...' },
  ta: { upload: 'அறிக்கை பதிவேற்றவும்', analyzing: 'பகுப்பாய்வு...' },
  te: { upload: 'రిపోర్ట్ అప్‌లోడ్', analyzing: 'విశ్లేషణ...' },
  mr: { upload: 'रिपोर्ट अपलोड करा', analyzing: 'विश्लेषण...' },
  kn: { upload: 'ವರದಿ ಅಪ್‌ಲೋಡ್', analyzing: 'ವಿಶ್ಲೇಷಣೆ...' },
  bn: { upload: 'রিপোর্ট আপলোড', analyzing: 'বিশ্লেষণ...' },
};

export default function FileUpload({ language, disabled }: FileUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = LABELS[language];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setError(null);
    setAnalysis(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Analysis failed');
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setError('Failed to analyze document. Please try again.');
    } finally {
      setIsAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={disabled || isAnalyzing}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium
                   text-teal-600 hover:text-teal-700 hover:bg-teal-50
                   rounded-xl border border-teal-200 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        )}
        {isAnalyzing ? t.analyzing : t.upload}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Analysis result */}
      {analysis && (
        <div className="bg-white border border-teal-200 rounded-2xl p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-sm font-semibold text-teal-800">Document Analysis</span>
          </div>
          <div className="prose prose-sm prose-teal max-w-none text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}
