import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (from @fontsource packages) rather than next/font/google, so a
// build never depends on reaching Google Fonts and guests make no third-party request.
// Paths must be string literals — the font loader reads them at compile time.
const display = localFont({
  src: '../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2',
  weight: '200 800',
  variable: '--font-display',
  display: 'swap',
});

const sans = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-italic.woff2', style: 'italic' },
  ],
  weight: '100 1000',
  variable: '--font-sans',
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
  themeColor: '#0E0E10',
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
      className={`h-full ${display.variable} ${sans.variable}`}
    >
      <body className="min-h-full bg-ink font-sans text-paper">{children}</body>
    </html>
  );
}
