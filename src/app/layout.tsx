import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/context/AppContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NadiKomuniti | Connect & Relax',
    template: '%s | NadiKomuniti',
  },
  description: 'Your connected community hub for local updates, reporting issues, discovering services and supporting your neighbourhood.',
  applicationName: 'NadiKomuniti',
  authors: [{ name: 'NadiKomuniti Team' }],
  generator: 'Next.js',
  keywords: [
    'NadiKomuniti',
    'Connect & Relax',
    'City of Elmina',
    'Bandar Elmina',
    'Denai Alam',
    'Community Hub',
    'Resilience Map',
    'Circular Exchange',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    url: '/',
    siteName: 'NadiKomuniti',
    title: 'NadiKomuniti | Connect & Relax',
    description: 'Your connected community hub for local updates, reporting issues, discovering services and supporting your neighbourhood.',
    images: [
      {
        url: '/nadikomuniti/og/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NadiKomuniti — Connect & Relax',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NadiKomuniti | Connect & Relax',
    description: 'Your connected community hub for local updates, reporting issues, discovering services and supporting your neighbourhood.',
    images: ['/nadikomuniti/og/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#BA1B1D' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1113' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('tesdh-theme') || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }

                  var scale = localStorage.getItem('tesdh-ui-scale') || 'default';
                  if (scale === 'compact' || scale === 'default' || scale === 'large') {
                    document.documentElement.setAttribute('data-ui-scale', scale);
                  } else {
                    document.documentElement.setAttribute('data-ui-scale', 'default');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F9FA] dark:bg-[#0F1113] text-slate-800 dark:text-slate-100 font-sans selection:bg-rose-100 selection:text-[#9E1315]">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
