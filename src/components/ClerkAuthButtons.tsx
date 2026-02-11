'use client';

import { useUser, UserButton, SignInButton } from '@clerk/nextjs';

interface ClerkAuthButtonsProps {
  onProfileClick: () => void;
}

/**
 * Clerk-dependent auth buttons for the header.
 * ONLY render this component inside ClerkProvider
 * (i.e., when CLERK_ENABLED is true).
 */
export default function ClerkAuthButtons({ onProfileClick }: ClerkAuthButtonsProps) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onProfileClick}
          className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50
                     px-2 py-1.5 rounded-lg transition-colors"
          aria-label="Health profile"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </button>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <button className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50
                         px-3 py-1.5 rounded-lg border border-teal-200 transition-colors font-medium">
        Sign in
      </button>
    </SignInButton>
  );
}
