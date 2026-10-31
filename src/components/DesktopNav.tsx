'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_TABS } from './BottomTabs';

interface Props {
  coupleNames: string;
  subtitle?: string;
}

/** Slim wide-breakpoint nav. Guests get the same structure, bigger photos. */
export function DesktopNav({ coupleNames, subtitle }: Props) {
  const pathname = usePathname();

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-veil/60 bg-[rgba(14,14,16,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
        <Link href="/" className="min-w-0">
          <span className="display block truncate text-[22px]">{coupleNames}</span>
          {subtitle && <span className="meta block text-[12px]">{subtitle}</span>}
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          {NAV_TABS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full px-4 py-2 text-sm transition-colors',
                  active ? 'bg-paper font-semibold text-ink' : 'text-ash hover:bg-plate hover:text-paper'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
