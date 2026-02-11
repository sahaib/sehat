import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Clerk middleware — protects nothing by default.
// All routes are public. Auth is opt-in (profile, uploads).
// Falls back to a passthrough if Clerk is not configured.
export default clerkEnabled
  ? clerkMiddleware()
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
