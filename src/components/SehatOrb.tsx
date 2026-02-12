'use client';

/**
 * SehatOrb — the signature ambient orb for Sehat.
 * Color cycles teal → cyan → indigo → teal via hue-rotate.
 *
 * sm/md: clean circle, no glow (fits in headers without clipping).
 * lg: big orb + separate blurred glow halo behind it.
 */

interface SehatOrbProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const HEART =
  'M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z';

export default function SehatOrb({ size = 'md', className = '' }: SehatOrbProps) {
  if (size === 'lg') {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <div
          className="absolute -inset-8 rounded-full sehat-orb-glow pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative w-28 h-28 rounded-full sehat-orb flex items-center justify-center shadow-xl">
          <svg className="w-14 h-14 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={HEART} />
          </svg>
        </div>
      </div>
    );
  }

  // sm / md — clean orb, no glow div
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className="w-10 h-10 rounded-full sehat-orb sehat-orb-sm flex items-center justify-center shadow-lg">
        <svg className="w-5 h-5 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={HEART} />
        </svg>
      </div>
    </div>
  );
}
