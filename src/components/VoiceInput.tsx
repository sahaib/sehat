'use client';

import { useState, useCallback } from 'react';
import { Language } from '@/types';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: Language;
  disabled: boolean;
}

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
        const langConfig = SUPPORTED_LANGUAGES.find(
          (l) => l.code === language
        );
        // Map to ISO 639-1 for Whisper
        const whisperLangMap: Record<Language, string> = {
          hi: 'hi',
          ta: 'ta',
          te: 'te',
          mr: 'mr',
          kn: 'kn',
          bn: 'bn',
          en: 'en',
        };

        const formData = new FormData();
        // Determine file extension from blob type
        const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
        formData.append('audio', blob, `recording.${ext}`);
        formData.append('language', whisperLangMap[language]);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Transcription failed');
        }

        const data = await response.json();
        if (data.text) {
          setTranscribedText(data.text);
          // Auto-submit after showing transcription briefly
          setTimeout(() => {
            onTranscript(data.text);
            setTranscribedText(null);
          }, 1000);
        } else {
          setTranscribeError('Could not understand the audio. Please try again or type your symptoms.');
        }
      } catch {
        setTranscribeError('Transcription failed. Please try again or type your symptoms.');
      } finally {
        setIsTranscribing(false);
      }
    },
    [language, onTranscript]
  );

  const { isRecording, isProcessing, error: recorderError, startRecording, stopRecording } =
    useVoiceRecorder(handleAudioReady);

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isProcessingAny = isProcessing || isTranscribing;
  const error = recorderError || transcribeError;

  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const listeningLabel =
    language === 'hi'
      ? 'सुन रहे हैं...'
      : language === 'ta'
        ? 'கேட்கிறோம்...'
        : language === 'te'
          ? 'వింటున్నాము...'
          : language === 'mr'
            ? 'ऐकत आहोत...'
            : language === 'kn'
              ? 'ಕೇಳುತ್ತಿದ್ದೇವೆ...'
              : language === 'bn'
                ? 'শুনছি...'
                : 'Listening...';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Mic button */}
      <button
        onClick={handleMicClick}
        disabled={disabled || isProcessingAny}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-200 active:scale-95
          ${
            isRecording
              ? 'bg-emergency-500 animate-recording-pulse'
              : 'bg-teal-600 hover:bg-teal-700'
          }
          ${disabled || isProcessingAny ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
      >
        {isProcessingAny ? (
          // Spinner
          <svg
            className="w-7 h-7 text-white animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : isRecording ? (
          // Stop icon
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Mic icon
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          </svg>
        )}
      </button>

      {/* Status label */}
      <span className="text-xs text-gray-400">
        {isRecording
          ? listeningLabel
          : isTranscribing
            ? 'Transcribing...'
            : isProcessing
              ? 'Processing...'
              : `${langConfig?.nativeLabel || 'Voice'}`}
      </span>

      {/* Transcribed text preview */}
      {transcribedText && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 text-sm text-teal-800 animate-fade-in max-w-xs text-center">
          &ldquo;{transcribedText}&rdquo;
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-emergency-600 text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
