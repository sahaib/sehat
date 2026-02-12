'use client';

import { useState, useEffect, useRef } from 'react';
import { EmergencyDetection } from '@/types';
import { EMERGENCY_NUMBERS } from '@/lib/constants';

interface EmergencyBannerProps {
  detection: EmergencyDetection;
}

export default function EmergencyBanner({ detection }: EmergencyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the primary action when banner appears
  useEffect(() => {
    if (!dismissed && dialogRef.current) {
      const firstLink = dialogRef.current.querySelector('a');
      if (firstLink instanceof HTMLElement) {
        firstLink.focus();
      }
    }
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-emergency-600/95 animate-fade-in emergency-shake"
      role="alertdialog"
      aria-modal="true"
      aria-label="Emergency detected"
    >
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        {/* Pulsing emergency icon */}
        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center animate-recording-pulse">
          <svg
            className="w-14 h-14 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white">EMERGENCY</h1>
        <p className="text-white/90 text-lg">
          Emergency symptoms detected. Please call for help immediately.
        </p>

        {/* Call 112 button */}
        <a
          href={`tel:${EMERGENCY_NUMBERS.unified}`}
          className="block w-full py-5 bg-white text-emergency-600 text-2xl font-bold
                     rounded-2xl shadow-lg active:scale-95 transition-transform ring-4 ring-white/30"
        >
          Call {EMERGENCY_NUMBERS.unified} Now
        </a>

        {/* Call 108 ambulance */}
        <a
          href={`tel:${EMERGENCY_NUMBERS.ambulance}`}
          className="block w-full py-4 bg-white/20 text-white text-xl font-semibold
                     rounded-2xl active:scale-95 transition-transform"
        >
          Ambulance: {EMERGENCY_NUMBERS.ambulance}
        </a>

        {/* Matched keywords */}
        {detection.matchedKeywords.length > 0 && (
          <p className="text-white/70 text-sm">
            Detected: {detection.matchedKeywords.slice(0, 3).join(', ')}
          </p>
        )}

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="text-white/60 text-sm underline hover:text-white/80 transition-colors mt-4"
        >
          I&apos;m not in immediate danger — continue to triage
        </button>
      </div>
    </div>
  );
}
