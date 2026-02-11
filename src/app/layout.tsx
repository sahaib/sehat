import type { Metadata, Viewport } from 'next';
import { Noto_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin', 'devanagari'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans',
});

export const metadata: Metadata = {
  title: 'Sehat - AI Medical Triage Assistant',
  description:
    'Multilingual voice-first medical triage agent that helps you understand symptom severity and get directed to the right level of care.',
  openGraph: {
    title: 'Sehat - AI Medical Triage Assistant',
    description:
      'Voice-first multilingual medical triage for India. Powered by Claude Opus 4.6.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D9488',
  viewportFit: 'cover',
};

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <html lang="en" className={notoSans.variable}>
      <head>
        {/* Preconnect to API origins for faster first requests */}
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.sarvam.ai" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-teal-50/80 via-white to-indigo-50/30 font-sans">
        {children}
      </body>
    </html>
  );

  if (clerkEnabled) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
