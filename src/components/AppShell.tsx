'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SehatOrb from './SehatOrb';

interface AppShellProps {
  title: string;
  children: ReactNode;
}

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    ),
    fill: true,
  },
  {
    href: '/history',
    label: 'History',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    ),
  },
  {
    href: '/period-health',
    label: 'Period',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    ),
    activeColor: 'text-pink-500',
    dotColor: 'bg-pink-500',
  },
];

export default function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Sticky top bar */}
      <header className="glass-header sticky top-0 z-20 border-b border-gray-200/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Back to Sehat home">
              <SehatOrb size="sm" />
              <span className="text-sm font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent hidden sm:inline">
                Sehat
              </span>
            </Link>
            <div className="h-5 w-px bg-gray-200/60 hidden sm:block" />
            <h1 className="text-lg font-bold text-gray-800">{title}</h1>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.filter(item => item.href !== '/').map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm'
                      : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50/60'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content area */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-20 md:hidden glass-header border-t border-gray-200/60 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const activeColor = item.activeColor || 'text-teal-600';
            const dotColor = item.dotColor || 'bg-teal-600';

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px] ${
                  isActive ? activeColor : 'text-gray-400 active:text-gray-500'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill={item.fill && isActive ? 'currentColor' : 'none'}
                  stroke={item.fill && isActive ? 'none' : 'currentColor'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                >
                  {item.icon}
                </svg>
                <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                {isActive && (
                  <div className={`w-1 h-1 rounded-full ${dotColor}`} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
