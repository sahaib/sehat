'use client';

import { useState, useCallback } from 'react';
import { Language } from '@/types';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: Language;
  disabled: boolean;
}

// BCP-47 language codes for Sarvam Saarika STT
const SARVAM_LANG_MAP: Record<Language, string> = {
  hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN', bn: 'bn-IN', en: 'en-IN',
};

const LISTENING_LABELS: Record<Language, string> = {
  hi: 'सुन रहे हैं...', ta: 'கேட்கிறோம்...', te: 'వింటున్నాము...',
  mr: 'ऐकत आहोत...', kn: 'ಕೇಳುತ್ತಿದ್ದೇವೆ...', bn: 'শুনছি...',
  en: 'Listening...',
};

export default function VoiceInput({
  onTranscript,
  language,
  disabled,
}: VoiceInputProps) {
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const handleAudioReady = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      setTranscribeError(null);
      try {
        const formData = new FormData();
        const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
        formData.append('audio', blob, `recording.${ext}`);
        formData.append('language', SARVAM_LANG_MAP[language]);
        const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Transcription failed');
        const data = await response.json();
        if (data.text) {
          setTranscribedText(data.text);
          setTimeout(() => { onTranscript(data.text); setTranscribedText(null); }, 1000);
        } else {
          setTranscribeError('Could not understand. Try again or type instead.');
        }
      } catch {
        setTranscribeError('Transcription failed. Try again or type instead.');
      } finally {
        setIsTranscribing(false);
      }
    },
    [language, onTranscript]
  );

  const { isRecording, isProcessing, error: recorderError, startRecording, stopRecording } =
    useVoiceRecorder(handleAudioReady);

  const handleMicClick = () => {
    if (isRecording) { stopRecording(); }
    else { setTranscribeError(null); startRecording(); }
  };

  const isProcessingAny = isProcessing || isTranscribing;
  const error = recorderError || transcribeError;
  const listeningLabel = LISTENING_LABELS[language];

  return (
    <>
      {/* Mic button — same size as send, sits right next to it */}
      <button
        onClick={handleMicClick}
        disabled={disabled || isProcessingAny}
        className={`w-9 h-9 rounded-full flex items-center justify-center
                   transition-all duration-150 active:scale-90
                   ${isRecording
                     ? 'bg-emergency-500 text-white animate-recording-pulse'
                     : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'
                   }
                   ${disabled || isProcessingAny ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
        title={isRecording ? listeningLabel : 'Voice input'}
      >
        {isProcessingAny ? (
          <svg className="w-[18px] h-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isRecording ? (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          </svg>
        )}
      </button>

      {/* Status toast — floats above the input bar */}
      {(isRecording || transcribedText || (error && !isRecording)) && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          {isRecording && (
            <div className="inline-flex items-center gap-2 bg-emergency-50 border border-emergency-200 rounded-xl px-4 py-2 text-sm text-emergency-700 animate-fade-in">
              <span className="w-2 h-2 bg-emergency-500 rounded-full animate-pulse" />
              {listeningLabel}
            </div>
          )}
          {transcribedText && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 text-sm text-teal-800 animate-fade-in">
              &ldquo;{transcribedText}&rdquo;
            </div>
          )}
          {error && !isRecording && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-600 animate-fade-in">
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
}
