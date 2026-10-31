'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CircleUserRound, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NAV_TABS = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' || p.startsWith('/functions') },
  { href: '/people', label: 'You', icon: CircleUserRound, match: (p: string) => p.startsWith('/people') },
  { href: '/saved', label: 'Saved', icon: Heart, match: (p: string) => p.startsWith('/saved') },
];

/** Floating pill tab bar on phones. Desktop navigation lives in DesktopNav. */
export function BottomTabs() {
  const pathname = usePathname();
  // Focused flows have their own back button and need the bottom for their main action.
  if (pathname.startsWith('/post')) return null;

  return (
    <nav
      className="md:hidden fixed inset-x-4 z-40"
      style={{ bottom: 'calc(14px + env(safe-area-inset-bottom))' }}
      aria-label="Main"
    >
      <div className="grid h-[60px] grid-cols-3 rounded-full border border-white/5 bg-[rgba(36,35,39,0.92)] shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center gap-1.5 text-[13.5px] transition-colors',
                active ? 'font-semibold text-accent' : 'text-ash active:text-paper'
              )}
            >
              <Icon
                className="h-[20px] w-[20px]"
                strokeWidth={active ? 2.1 : 1.7}
                fill={active && tab.href === '/saved' ? 'currentColor' : 'none'}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
