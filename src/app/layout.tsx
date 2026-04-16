import type { Metadata } from 'next';
import { Alexandria } from 'next/font/google';
import { GlobalProviders } from '@/providers';
import { SWRegistration } from '@/components/sw-registration';
import './globals.css';

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  variable: '--font-alexandria',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Tolo',
  description: 'منصة تعليمية تفاعلية',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

import { cookies } from 'next/headers';
import { ThemeProvider } from '@/providers/theme-provider';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const hasAuthToken = cookieStore.has('refresh_token') || cookieStore.has('session_id');

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={alexandria.variable} suppressHydrationWarning>
        <SWRegistration />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <GlobalProviders initialAuthHint={hasAuthToken}>{children}</GlobalProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
