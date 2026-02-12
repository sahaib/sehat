import type { Metadata, Viewport } from 'next';
import { Noto_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import ErrorBoundary from '@/components/ErrorBoundary';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin', 'devanagari'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans',
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sehat.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Sehat - AI Medical Triage Assistant',
    template: '%s | Sehat',
  },
  description:
    'Voice-first multilingual medical triage for India. Speak your symptoms in Hindi, Tamil, Telugu, Marathi, Kannada, Bengali, or English. AI-powered severity assessment with Claude Opus 4.6 extended thinking.',
  keywords: [
    'medical triage',
    'AI health',
    'voice health assistant',
    'multilingual medical',
    'India healthcare',
    'symptom checker',
    'Hindi medical',
    'Claude Opus',
    'emergency detection',
    'health triage India',
  ],
  authors: [{ name: 'Sahaib Singh Arora' }],
  creator: 'Sahaib Singh Arora',
  category: 'health',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Sehat - AI Medical Triage Assistant',
    description:
      'Voice-first medical triage in 7 Indian languages. Understand symptom severity and get directed to the right care. Powered by Claude Opus 4.6.',
    type: 'website',
    siteName: 'Sehat',
    locale: 'en_IN',
    url: baseUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sehat - AI Medical Triage Assistant',
    description:
      'Voice-first medical triage in 7 Indian languages. Powered by Claude Opus 4.6 extended thinking.',
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
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Sehat',
              alternateName: 'सेहत',
              description:
                'Voice-first multilingual medical triage for India. AI-powered severity assessment in 7 Indian languages.',
              url: baseUrl,
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
              },
              author: {
                '@type': 'Person',
                name: 'Sahaib Singh Arora',
              },
              inLanguage: ['en', 'hi', 'ta', 'te', 'mr', 'kn', 'bn'],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-teal-50/80 via-white to-indigo-50/30 font-sans">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );

  if (clerkEnabled) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
