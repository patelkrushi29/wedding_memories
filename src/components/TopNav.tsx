'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/highlights', label: 'Highlights' },
  { href: '/photos', label: 'Photos' },
  { href: '/albums', label: 'Albums' },
  { href: '/videos', label: 'Videos' },
  { href: '/selected', label: 'Selected' },
  { href: '/find-yourself', label: 'Find Yourself', disabled: true },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/highlights" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-[#c9a96e] fill-[#c9a96e]" />
            <span className="font-serif text-xl font-semibold text-gray-800">Wedding Memories</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.disabled ? '#' : link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  link.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : pathname === link.href
                    ? 'bg-[#fdf7ef] text-[#c9a96e]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                onClick={(e) => link.disabled && e.preventDefault()}
                title={link.disabled ? 'Coming soon' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.disabled ? '#' : link.href}
                className={cn(
                  'px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  link.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : pathname === link.href
                    ? 'bg-[#fdf7ef] text-[#c9a96e]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                onClick={(e) => {
                  if (link.disabled) e.preventDefault();
                  else setMobileOpen(false);
                }}
              >
                {link.label}
                {link.disabled && <span className="ml-2 text-xs text-gray-400">(coming soon)</span>}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
