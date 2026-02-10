import type { Metadata, Viewport } from 'next';
import './globals.css';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-teal-50/30 font-sans">
        {children}
      </body>
    </html>
  );
}
