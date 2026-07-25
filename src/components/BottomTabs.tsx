'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Users, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'The days', icon: CalendarDays, match: (p: string) => p === '/' || p.startsWith('/functions') },
  { href: '/people', label: 'People', icon: Users, match: (p: string) => p.startsWith('/people') },
  { href: '/saved', label: 'Saved', icon: Heart, match: (p: string) => p.startsWith('/saved') },
];

/** Mobile tab bar. Desktop navigation lives in DesktopNav. */
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-veil bg-[rgba(21,16,13,0.94)] backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1.5 pt-3.5 pb-4 transition-colors',
                active ? 'text-paper' : 'text-dim active:text-ash'
              )}
            >
              <Icon
                className={cn('h-[19px] w-[19px]', active && 'text-halide')}
                strokeWidth={active ? 1.9 : 1.5}
                fill={active && tab.href === '/saved' ? 'currentColor' : 'none'}
              />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
