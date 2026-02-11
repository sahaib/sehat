'use client';

import { useUser, SignInButton } from '@clerk/nextjs';

interface ClerkSignUpCTAProps {
  ctaText: string;
  onProfileClick: () => void;
  profileLabel: string;
}

/**
 * Clerk-dependent CTA button for the sign-up prompt.
 * ONLY render this inside ClerkProvider (when CLERK_ENABLED is true).
 * Returns either a Sign In button (anonymous) or Complete Profile button (signed in).
 */
export default function ClerkSignUpCTA({ ctaText, onProfileClick, profileLabel }: ClerkSignUpCTAProps) {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <button
        onClick={onProfileClick}
        className="flex-1 py-2 bg-teal-600 text-white text-sm font-semibold
                   rounded-xl hover:bg-teal-700 transition-colors active:scale-[0.98]"
      >
        {profileLabel}
      </button>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className="flex-1 py-2 bg-teal-600 text-white text-sm font-semibold
                   rounded-xl hover:bg-teal-700 transition-colors active:scale-[0.98]"
      >
        {ctaText}
      </button>
    </SignInButton>
  );
}
