import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/context/AppContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TESDH Community Hub | City of Elmina — Sime Darby Property',
  description: 'Smart and resilient residential community platform for Bandar Elmina, Denai Alam, and Ara Damansara. Featuring Community Feed, Resilience Disaster Map, Exchange, and Mediated Privacy.',
  keywords: ['TESDH', 'Sime Darby Property', 'Bandar Elmina', 'City of Elmina', 'Denai Alam', 'Community Hub', 'Resilience Map', 'Circular Economy'],
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
