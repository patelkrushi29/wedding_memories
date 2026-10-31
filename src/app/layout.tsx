import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (from @fontsource packages) rather than next/font/google, so a
// build never depends on reaching Google Fonts and guests make no third-party request.
// Paths must be string literals — the font loader reads them at compile time.

const newsreader = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2', style: 'italic' },
  ],
  weight: '200 800',
  variable: '--font-serif',
  display: 'swap',
});

const instrumentSans = localFont({
  src: '../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
  weight: '400 700',
  variable: '--font-sans',
  display: 'swap',
});

const plexMono = localFont({
  src: [
    { path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
    { path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wedding Memories',
  description: 'Our wedding photographs and film',
  appleWebApp: {
    capable: true,
    title: 'Memories',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#15100D',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${newsreader.variable} ${instrumentSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full bg-ink font-sans text-paper">{children}</body>
    </html>
  );
}
