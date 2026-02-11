'use client';

/**
 * Whether Clerk is configured. This is a build-time constant
 * inlined by Next.js from the NEXT_PUBLIC_ env var.
 */
export const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
