'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '@/types';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

type VoicePhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

const SARVAM_LANG_MAP: Record<Language, string> = {
  hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN', bn: 'bn-IN', en: 'en-IN',
};

const PHASE_LABELS: Record<VoicePhase, Record<Language, string>> = {
  idle: {
    hi: 'बोलने के लिए टैप करें', ta: 'பேச தட்டவும்', te: 'మాట్లాడటానికి నొక్కండి',
    mr: 'बोलण्यासाठी टॅप करा', kn: 'ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ', bn: 'বলতে ট্যাপ করুন', en: 'Tap to speak',
  },
  listening: {
    hi: 'सुन रहे हैं...', ta: 'கேட்கிறோம்...', te: 'వింటున్నాము...',
    mr: 'ऐकत आहोत...', kn: 'ಕೇಳುತ್ತಿದ್ದೇವೆ...', bn: 'শুনছি...', en: 'Listening...',
  },
  transcribing: {
    hi: 'समझ रहे हैं...', ta: 'புரிந்துகொள்கிறோம்...', te: 'అర్థం చేసుకుంటున్నాము...',
    mr: 'समजून घेत आहोत...', kn: 'ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ...', bn: 'বুঝছি...', en: 'Processing...',
  },
  thinking: {
    hi: 'सोच रहे हैं...', ta: 'யோசிக்கிறோம்...', te: 'ఆలోచిస్తున్నాము...',
    mr: 'विचार करत आहोत...', kn: 'ಯೋಚಿಸುತ್ತಿದ್ದೇವೆ...', bn: 'ভাবছি...', en: 'Thinking...',
  },
  speaking: {
    hi: 'बोल रहे हैं...', ta: 'பேசுகிறோம்...', te: 'చెబుతున్నాము...',
    mr: 'बोलत आहोत...', kn: 'ಹೇಳುತ್ತಿದ್ದೇವೆ...', bn: 'বলছি...', en: 'Speaking...',
  },
};

interface VoiceConversationModeProps {
  language: Language;
  onTranscript: (text: string) => void;
  onExit: () => void;
  textToSpeak: string | null;
  isProcessing: boolean;
}

export default function VoiceConversationMode({
  language,
  onTranscript,
  onExit,
  textToSpeak,
  isProcessing,
}: VoiceConversationModeProps) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const handleAudioReady = useCallback(
    async (blob: Blob) => {
      if (!mountedRef.current) return;
      setPhase('transcribing');
      try {
        const formData = new FormData();
        const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
        formData.append('audio', blob, `recording.${ext}`);
        formData.append('language', SARVAM_LANG_MAP[language]);
        const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Transcription failed');
        const data = await response.json();
        if (data.text && mountedRef.current) {
          setPhase('thinking');
          onTranscript(data.text);
        } else if (mountedRef.current) {
          setPhase('idle');
        }
      } catch {
        if (mountedRef.current) setPhase('idle');
      }
    },
    [language, onTranscript]
  );

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(handleAudioReady);

  const startListening = useCallback(() => {
    setPhase('listening');
    startRecording();
  }, [startRecording]);

  // Track processing state from parent
  useEffect(() => {
    if (isProcessing && phase !== 'speaking') {
      setPhase('thinking');
    }
  }, [isProcessing, phase]);

  // Auto-speak when textToSpeak changes
  useEffect(() => {
    if (!textToSpeak || textToSpeak === lastSpokenRef.current) return;
    lastSpokenRef.current = textToSpeak;

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const speak = async () => {
      if (!mountedRef.current) return;
      setPhase('speaking');
      try {
        const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === language);
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            language_code: langConfig?.speechCode || 'en-IN',
          }),
        });
        if (!response.ok) throw new Error('TTS failed');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (mountedRef.current) {
            setPhase('idle');
            // Auto-listen after speaking
            setTimeout(() => {
              if (mountedRef.current) startListening();
            }, 400);
          }
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          if (mountedRef.current) {
            setPhase('idle');
          }
        };

        await audio.play();
      } catch {
        if (mountedRef.current) {
          setPhase('idle');
        }
      }
    };

    speak();
  }, [textToSpeak, language, startListening]);

  // Auto-start listening on mount
  useEffect(() => {
    mountedRef.current = true;
    // Small delay to let component settle
    const t = setTimeout(() => {
      if (mountedRef.current) startListening();
    }, 300);
    return () => {
      mountedRef.current = false;
      clearTimeout(t);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicTap = () => {
    if (phase === 'speaking' && audioRef.current) {
      // Interrupt speech → start listening
      audioRef.current.pause();
      audioRef.current = null;
      startListening();
      return;
    }
    if (isRecording) {
      stopRecording();
    } else if (phase === 'idle') {
      startListening();
    }
  };

  const handleExit = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (isRecording) {
      stopRecording();
    }
    onExit();
  };

  const label = PHASE_LABELS[phase][language];

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Phase label */}
      <p className={`text-sm font-medium transition-colors duration-300 ${
        phase === 'listening' ? 'text-red-500' :
        phase === 'speaking' ? 'text-teal-600' :
        'text-gray-400'
      }`}>
        {label}
      </p>

      {/* Animated rings behind mic */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings */}
        {(phase === 'listening') && (
          <>
            <span className="absolute w-24 h-24 rounded-full bg-red-100 animate-ping opacity-30" />
            <span className="absolute w-20 h-20 rounded-full bg-red-100 animate-pulse opacity-40" />
          </>
        )}
        {(phase === 'speaking') && (
          <>
            <span className="absolute w-24 h-24 rounded-full bg-teal-100 animate-ping opacity-30" />
            <span className="absolute w-20 h-20 rounded-full bg-teal-100 animate-pulse opacity-40" />
          </>
        )}

        {/* Main button */}
        <button
          onClick={handleMicTap}
          disabled={phase === 'transcribing' || phase === 'thinking'}
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center
                     transition-all duration-300 shadow-lg active:scale-90
                     ${phase === 'listening'
                       ? 'bg-red-500 text-white scale-110'
                       : phase === 'speaking'
                         ? 'bg-teal-500 text-white'
                         : phase === 'transcribing' || phase === 'thinking'
                           ? 'bg-gray-300 text-gray-500'
                           : 'bg-teal-600 text-white hover:bg-teal-700'
                     }`}
          aria-label={phase === 'listening' ? 'Stop recording' : 'Start recording'}
        >
          {phase === 'speaking' ? (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
            </svg>
          ) : (phase === 'transcribing' || phase === 'thinking') ? (
            <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : phase === 'listening' ? (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Exit button */}
      <button
        onClick={handleExit}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1"
      >
        Switch to text
      </button>
    </div>
  );
}
