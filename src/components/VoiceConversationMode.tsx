'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '@/types';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { streamTTS, TTSPlaybackController } from '@/lib/tts-client';
import { startCalmAudio, stopCalmAudio } from '@/lib/calm-audio';

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

// Safety timeout: if stuck in thinking/transcribing for >60s, reset to idle
const STUCK_TIMEOUT = 60000;

export default function VoiceConversationMode({
  language,
  onTranscript,
  onExit,
  textToSpeak,
  isProcessing,
}: VoiceConversationModeProps) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const ttsControllerRef = useRef<TTSPlaybackController | null>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const stuckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play calm ambient audio during thinking/transcribing phases
  useEffect(() => {
    if (phase === 'thinking' || phase === 'transcribing') {
      startCalmAudio();
    } else {
      stopCalmAudio();
    }
    return () => { stopCalmAudio(); };
  }, [phase]);

  // Safety: reset stuck phases after timeout
  useEffect(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
    if (phase === 'thinking' || phase === 'transcribing') {
      stuckTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('[VoiceMode] Stuck in', phase, '— resetting to idle');
          setPhase('idle');
        }
      }, STUCK_TIMEOUT);
    }
    return () => {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
    };
  }, [phase]);

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
          // Empty transcript — go back to listening automatically
          setPhase('idle');
          setTimeout(() => {
            if (mountedRef.current) startListeningRef.current();
          }, 300);
        }
      } catch {
        if (mountedRef.current) {
          setPhase('idle');
          // Auto-retry listening on transcription error
          setTimeout(() => {
            if (mountedRef.current) startListeningRef.current();
          }, 300);
        }
      }
    },
    [language, onTranscript]
  );

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(handleAudioReady);

  const startListening = useCallback(async () => {
    setPhase('listening');
    try {
      await startRecording();
    } catch {
      // Mic access failed — fall back to idle so user can retry
      if (mountedRef.current) setPhase('idle');
    }
  }, [startRecording]);

  // Keep a stable ref so callbacks don't go stale
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  // Sync phase with parent processing state
  useEffect(() => {
    if (isProcessing && phase !== 'speaking') {
      setPhase('thinking');
    }
    // When processing finishes and we're still in thinking, something completed
    // without triggering TTS — reset to idle
    if (!isProcessing && phase === 'thinking' && !textToSpeak) {
      setPhase('idle');
    }
  }, [isProcessing, phase, textToSpeak]);

  useEffect(() => {
    if (!textToSpeak || textToSpeak === lastSpokenRef.current) return;
    lastSpokenRef.current = textToSpeak;

    // Stop any ongoing TTS
    if (ttsControllerRef.current) {
      ttsControllerRef.current.stop();
      ttsControllerRef.current = null;
    }

    if (!mountedRef.current) return;

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === language);
    const speechCode = langConfig?.speechCode || 'en-IN';

    // Use WebSocket streaming TTS — first chunk plays within ~200-300ms
    const controller = streamTTS({
      text: textToSpeak,
      languageCode: speechCode,
      onStart: () => {
        if (mountedRef.current) setPhase('speaking');
      },
      onEnd: () => {
        ttsControllerRef.current = null;
        if (mountedRef.current) {
          setPhase('idle');
          // Auto-listen after speaking
          setTimeout(() => {
            if (mountedRef.current) startListeningRef.current();
          }, 400);
        }
      },
      onError: () => {
        ttsControllerRef.current = null;
        if (mountedRef.current) {
          setPhase('idle');
          // Auto-listen on TTS error too so voice loop doesn't break
          setTimeout(() => {
            if (mountedRef.current) startListeningRef.current();
          }, 400);
        }
      },
    });

    ttsControllerRef.current = controller;
    setPhase('speaking');
  }, [textToSpeak, language]);

  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(() => {
      if (mountedRef.current) startListeningRef.current();
    }, 300);
    return () => {
      mountedRef.current = false;
      clearTimeout(t);
      // Stop recording to release mic (privacy + battery)
      stopRecording();
      if (ttsControllerRef.current) {
        ttsControllerRef.current.stop();
        ttsControllerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicTap = () => {
    // Interrupt TTS to start listening
    if (phase === 'speaking' && ttsControllerRef.current) {
      ttsControllerRef.current.stop();
      ttsControllerRef.current = null;
      startListening();
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      // Allow restarting from ANY non-recording state (idle, listening with failed mic, etc.)
      startListening();
    }
  };

  const handleExit = () => {
    if (ttsControllerRef.current) {
      ttsControllerRef.current.stop();
      ttsControllerRef.current = null;
    }
    if (isRecording) stopRecording();
    onExit();
  };

  const label = PHASE_LABELS[phase][language];

  // Determine ambient glow class
  const glowClass =
    phase === 'listening' ? 'ambient-glow--listening' :
    phase === 'speaking' ? 'ambient-glow--speaking' :
    (phase === 'thinking' || phase === 'transcribing') ? 'ambient-glow--thinking' :
    '';

  // Glow bar variant
  const barClass =
    phase === 'speaking' ? 'glow-bar glow-bar--speaking' :
    phase === 'listening' ? 'glow-bar' :
    '';

  return (
    <>
      {/* Ambient glow overlay — covers the entire screen */}
      {phase !== 'idle' && (
        <div className={`ambient-glow animate-fade-in ${glowClass}`} aria-hidden="true">
          <div className="ambient-glow-orb" />
          <div className="ambient-glow-orb" />
          <div className="ambient-glow-orb" />
        </div>
      )}

      <div className="flex flex-col items-center gap-4 py-6 relative z-50">
        {/* Phase label */}
        <p className={`text-sm font-medium transition-all duration-500 ${
          phase === 'listening' ? 'text-orange-500' :
          phase === 'speaking' ? 'text-teal-500' :
          phase === 'thinking' || phase === 'transcribing' ? 'text-purple-500' :
          'text-gray-400'
        }`}>
          {label}
        </p>

        {/* Mic button with animated ring */}
        <div className="relative flex items-center justify-center">
          {/* Spinning gradient ring — active when listening/speaking */}
          {(phase === 'listening' || phase === 'speaking') && (
            <div className="voice-ring" />
          )}

          {/* Soft outer glow */}
          {phase === 'listening' && (
            <div className="absolute inset-[-20px] rounded-full opacity-60 animate-pulse"
                 style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.3) 0%, transparent 70%)' }} />
          )}
          {phase === 'speaking' && (
            <div className="absolute inset-[-20px] rounded-full opacity-60 animate-pulse"
                 style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.3) 0%, transparent 70%)' }} />
          )}
          {(phase === 'thinking' || phase === 'transcribing') && (
            <div className="absolute inset-[-20px] rounded-full opacity-60 animate-pulse"
                 style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.25) 0%, transparent 70%)' }} />
          )}

          {/* Main button — NEVER fully disabled, always tappable for recovery */}
          <button
            onClick={handleMicTap}
            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center
                       transition-all duration-500 active:scale-90
                       ${phase === 'listening'
                         ? 'bg-gradient-to-br from-orange-400 to-rose-500 text-white scale-110'
                         : phase === 'speaking'
                           ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white'
                           : phase === 'transcribing' || phase === 'thinking'
                             ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white'
                             : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white hover:scale-105'
                       }`}
            style={{
              boxShadow: phase === 'listening'
                ? '0 0 30px rgba(251,146,60,0.5), 0 0 60px rgba(244,63,94,0.2)'
                : phase === 'speaking'
                  ? '0 0 30px rgba(45,212,191,0.4), 0 0 60px rgba(13,148,136,0.15)'
                  : phase === 'thinking' || phase === 'transcribing'
                    ? '0 0 30px rgba(147,51,234,0.35), 0 0 60px rgba(99,102,241,0.15)'
                    : '0 8px 25px rgba(13,148,136,0.3)'
            }}
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

        {/* Glow bar — like Claude's warm gradient bar */}
        {(phase === 'listening' || phase === 'speaking') && (
          <div className={`w-full max-w-xs h-12 rounded-full flex items-center justify-center animate-fade-in ${barClass}`}>
            <span className={`relative z-10 text-xs font-medium ${
              phase === 'listening' ? 'text-orange-700/70' : 'text-teal-700/70'
            }`}>
              {phase === 'listening' ? 'Tap mic to stop' : 'Tap mic to interrupt'}
            </span>
          </div>
        )}

        {/* Exit button */}
        <button
          onClick={handleExit}
          className="text-xs text-gray-400 hover:text-gray-600 transition-all duration-200
                     px-4 py-1.5 rounded-full hover:bg-white/50 backdrop-blur-sm"
        >
          Switch to text
        </button>
      </div>
    </>
  );
}
