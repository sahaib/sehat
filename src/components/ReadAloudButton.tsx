'use client';

import { useState, useRef, useCallback } from 'react';

interface ReadAloudButtonProps {
  text: string;
  languageCode: string;
  size?: 'sm' | 'md';
}

export default function ReadAloudButton({ text, languageCode, size = 'sm' }: ReadAloudButtonProps) {
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = useCallback(async () => {
    if (ttsState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setTtsState('idle');
      return;
    }

    if (ttsState === 'loading') return;

    setTtsState('loading');
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language_code: languageCode,
        }),
      });

      if (!response.ok) throw new Error('TTS request failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setTtsState('idle');
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setTtsState('idle');
        URL.revokeObjectURL(audioUrl);
      };

      setTtsState('playing');
      await audio.play();
    } catch {
      setTtsState('idle');
    }
  }, [ttsState, text, languageCode]);

  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <button
      onClick={handleClick}
      disabled={ttsState === 'loading'}
      className={`inline-flex items-center gap-1.5 ${textSize} font-medium transition-all active:scale-95
                  ${ttsState === 'playing'
                    ? 'text-teal-700'
                    : 'text-teal-600 hover:text-teal-700'
                  } ${ttsState === 'loading' ? 'opacity-60 cursor-wait' : ''}`}
      aria-label={ttsState === 'playing' ? 'Stop reading' : 'Read aloud'}
    >
      {ttsState === 'loading' ? (
        <svg className={`${iconSize} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ) : ttsState === 'playing' ? (
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
          <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
        </svg>
      )}
      {ttsState === 'loading' ? 'Loading...' : ttsState === 'playing' ? 'Stop' : 'Read aloud'}
    </button>
  );
}
