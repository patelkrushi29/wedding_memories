'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, CalendarDays, ScanFace, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/photos', label: 'Photos', icon: ImageIcon },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/find-yourself', label: 'Find Me', icon: ScanFace },
  { href: '/selected', label: 'Selected', icon: Heart },
];

const desktopLinks = [
  { href: '/', label: 'Feed' },
  { href: '/photos', label: 'Photos' },
  { href: '/events', label: 'Events' },
  { href: '/videos', label: 'Videos' },
  { href: '/find-yourself', label: 'Find Yourself' },
  { href: '/selected', label: 'Selected' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar: full nav on desktop, brand-only on mobile */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#c9a96e] fill-[#c9a96e]" />
              <span className="font-serif text-lg md:text-xl font-semibold text-gray-800">
                Wedding Memories
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {desktopLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(pathname, link.href)
                      ? 'bg-[#fdf7ef] text-[#c9a96e]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Bottom tab bar — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-[#c9a96e]' : 'text-gray-400 active:text-gray-600'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'fill-[#fdf7ef]')} strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
