'use client';

import { useUser } from '@clerk/nextjs';

/**
 * Safe wrapper around Clerk's useUser hook.
 * Returns { isSignedIn: false } when Clerk is not configured.
 */
export function useAuth() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isSignedIn, user, isLoaded } = useUser();
    return { isSignedIn: !!isSignedIn, user, isLoaded, clerkEnabled: true };
  } catch {
    return { isSignedIn: false, user: null, isLoaded: true, clerkEnabled: false };
  }
}
