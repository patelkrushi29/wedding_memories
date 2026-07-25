'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'The days', match: (p: string) => p === '/' || p.startsWith('/functions') },
  { href: '/people', label: 'People', match: (p: string) => p.startsWith('/people') },
  { href: '/saved', label: 'Saved', match: (p: string) => p.startsWith('/saved') },
];

interface Props {
  coupleNames: string;
  subtitle?: string;
}

/** Slim wide-breakpoint nav. Guests get the same structure, bigger photos. */
export function DesktopNav({ coupleNames, subtitle }: Props) {
  const pathname = usePathname();

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-veil bg-[rgba(21,16,13,0.9)] backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="min-w-0">
          <span className="display text-xl block truncate">{coupleNames}</span>
          {subtitle && <span className="mono block mt-0.5">{subtitle}</span>}
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-[8px] text-sm transition-colors',
                link.match(pathname)
                  ? 'bg-plate text-paper'
                  : 'text-ash hover:text-paper hover:bg-plate/60'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
