import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Alexandria } from 'next/font/google';
import { GlobalProviders } from '@/providers';
import { SWRegistration } from '@/components/sw-registration';
import './globals.css';
import './ultra-lite.css';
import Header from '@/components/header/Header';
import React, { Suspense } from 'react';
import { ThemeProvider } from '@/providers/theme-provider';
import {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from '@/components/layout/ConditionalAnalytics';
import { FPSMonitor } from '@/components/adaptive/AdaptiveLoading';

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  variable: '--font-alexandria',
  display: 'swap',
  preload: true,
  weight: ['400', '600', '700'],
  adjustFontFallback: true,
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: { default: 'Tolo - منصة تعليمية تفاعلية', template: '%s | Tolo' },
  description: 'منصة تعليمية تفاعلية للثانوية العامة - كورسات، امتحانات، ومدرسين',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Tolo - منصة تعليمية تفاعلية',
    description: 'منصة تعليمية تفاعلية للثانوية العامة',
    type: 'website',
    locale: 'ar_AR',
    siteName: 'Tolo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tolo - منصة تعليمية تفاعلية',
    description: 'منصة تعليمية تفاعلية للثانوية العامة',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the CSP nonce that the middleware set on the request headers.
  // This nonce MUST be applied to every inline <script> we render so the
  // browser allows them under the `script-src 'nonce-...'` directive.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <ClerkProvider nonce={nonce}>
      <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">

        <head>
          {/* Inline performance detection - runs synchronously before render to prevent FOUC */}
          <script
            id="perf-detect"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  'use strict';
                  try {
                    var ROOT = document.documentElement;
                    var nav = navigator;
                    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;

                    var score = 50;
                    var signals = {};

                    // ===== Memory =====
                    var mem = nav.deviceMemory;
                    signals.deviceMemory = typeof mem === 'number' ? mem : null;
                    if (typeof mem === 'number') {
                      if (mem >= 8) score += 25;
                      else if (mem >= 4) score += 10;
                      else if (mem >= 2) score -= 5;
                      else score -= 25;
                    }

                    // ===== CPU cores =====
                    var cores = nav.hardwareConcurrency;
                    signals.hardwareConcurrency = typeof cores === 'number' ? cores : null;
                    if (typeof cores === 'number') {
                      if (cores >= 8) score += 20;
                      else if (cores >= 4) score += 5;
                      else if (cores >= 2) score -= 10;
                      else score -= 25;
                    }

                    // ===== Network =====
                    var connType = (conn && conn.effectiveType) || '4g';
                    var downlink = (conn && conn.downlink) || null;
                    var rtt = (conn && conn.rtt) || null;
                    signals.effectiveType = connType;
                    signals.downlink = downlink;
                    signals.rtt = rtt;
                    signals.saveData = !!(conn && conn.saveData);

                    if (connType === '4g') score += 10;
                    else if (connType === '3g') score -= 15;
                    else if (connType === '2g') score -= 30;
                    else if (connType === 'slow-2g') score -= 40;

                    if (signals.saveData) score -= 30;
                    if (downlink && downlink < 1.5) score -= 15;
                    if (rtt && rtt > 500) score -= 10;

                    // ===== WebGL renderer detection =====
                    try {
                      var canvas = document.createElement('canvas');
                      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                      if (gl) {
                        var ext = gl.getExtension('WEBGL_debug_renderer_info');
                        if (ext) {
                          var renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
                          signals.gpuRenderer = String(renderer).slice(0, 120);
                          if (/SwiftShader|Software|llvmpipe|Microsoft Basic/i.test(renderer)) {
                            score -= 30;
                            signals.gpuType = 'software';
                          } else if (/Mali-4|Adreno \\(TM\\) [12]\\d\\d|PowerVR SGX/i.test(renderer)) {
                            score -= 10;
                            signals.gpuType = 'weak';
                          } else {
                            signals.gpuType = 'hardware';
                          }
                        }
                      } else {
                        score -= 15;
                        signals.gpuType = 'none';
                      }
                    } catch (e) {
                      signals.gpuType = 'unknown';
                    }

                    // ===== Battery =====
                    try {
                      if (nav.getBattery) {
                        nav.getBattery().then(function (bat) {
                          try {
                            if (bat.level <= 0.15 && !bat.charging) {
                              ROOT.setAttribute('data-low-battery', '1');
                              var currentMode = ROOT.getAttribute('data-perf-mode');
                              if (currentMode === 'performance' || currentMode === 'balanced') {
                                applyMode('saver');
                              }
                            }
                          } catch (e) {}
                        }).catch(function () {});
                      }
                    } catch (e) {}

                    // ===== Media queries =====
                    try {
                      if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) {
                        score -= 25;
                        signals.reducedData = true;
                      }
                      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        signals.reducedMotion = true;
                      }
                    } catch (e) {}

                    // ===== Real CPU benchmark =====
                    try {
                      var t0 = performance.now();
                      var acc = 0;
                      for (var i = 0; i < 200000; i++) {
                        acc += Math.sqrt(i) * Math.sin(i);
                      }
                      var dt = performance.now() - t0;
                      signals.cpuBenchMs = Math.round(dt);
                      if (dt > 35) score -= 25;
                      else if (dt > 20) score -= 12;
                      else if (dt < 6) score += 5;
                    } catch (e) {}

                    // ===== UA-based device class =====
                    var ua = nav.userAgent || '';
                    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
                    var isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (nav.maxTouchPoints > 1 && /Macintosh/i.test(ua));
                    signals.isMobile = isMobile;
                    signals.isTablet = isTablet;

                    if (isMobile && typeof cores === 'number' && cores < 4) score -= 15;
                    if (isMobile && typeof cores === 'number' && cores <= 2) score -= 10;
                    if (isTablet) score += 5;

                    // Clamp
                    if (score < 0) score = 0;
                    if (score > 100) score = 100;
                    signals.score = score;

                    // ===== Decide mode =====
                    var mode;
                    if (signals.saveData) mode = 'ultra-lite';
                    else if (connType === 'slow-2g' || connType === '2g') mode = 'ultra-lite';
                    else if (score < 20) mode = 'ultra-lite';
                    else if (score < 35) mode = 'saver';
                    else if (score < 50) mode = 'lite';
                    else if (score < 75) mode = 'balanced';
                    else mode = 'performance';

                    applyMode(mode);

                    // Persist detection signals for client hooks (lightweight)
                    try {
                      localStorage.setItem('tolo-device-signals', JSON.stringify(signals));
                    } catch (e) {}

                    function applyMode(m) {
                      ROOT.classList.remove('efficiency-mode', 'lite-mode', 'ultra-lite-mode');
                      if (m === 'saver') ROOT.classList.add('efficiency-mode');
                      else if (m === 'lite') ROOT.classList.add('lite-mode');
                      else if (m === 'ultra-lite') {
                        ROOT.classList.add('efficiency-mode');
                        ROOT.classList.add('ultra-lite-mode');
                      }
                      ROOT.setAttribute('data-perf-mode', m);
                      ROOT.setAttribute('data-perf-ready', '1');
                    }
                  } catch (e) {
                    try { document.documentElement.setAttribute('data-perf-mode', 'balanced'); } catch (e2) {}
                  }
                })();
              `
            }}
          />
          <link rel="dns-prefetch" href="https://i.ytimg.com" />
          <link rel="preload" href="/favicon.svg" as="image" type="image/svg+xml" />
          <meta name="theme-color" content="#f97316" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          <meta name="format-detection" content="telephone=no" />
          <script
            id="hydration-fix"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const attributesToRemove = [
                    'bis_skin_checked',
                    'bis_register',
                    'data-gr-ext-installed',
                    'data-new-gr-c-s-check-loaded',
                    'data-lastpass-icon',
                    'data-dashlane-rid'
                  ];

                  const clean = () => {
                    try {
                      attributesToRemove.forEach(attr => {
                        document.querySelectorAll('[' + attr + ']').forEach(el => {
                          el.removeAttribute(attr);
                        });
                      });
                      if (document.documentElement.hasAttribute('__processed_id')) {
                        document.documentElement.removeAttribute('__processed_id');
                      }
                    } catch (e) {}
                  };

                  clean();

                  try {
                    const observer = new MutationObserver((mutations) => {
                      let shouldClean = false;
                      for (let i = 0; i < mutations.length; i++) {
                        if (attributesToRemove.includes(mutations[i].attributeName) || mutations[i].attributeName === '__processed_id') {
                          shouldClean = true;
                          break;
                        }
                      }
                      if (shouldClean) clean();
                    });

                    observer.observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: attributesToRemove.concat(['__processed_id'])
                    });

                    const disconnect = () => {
                      setTimeout(() => observer.disconnect(), 15000);
                    };

                    if (document.readyState === 'complete') {
                      disconnect();
                    } else {
                      window.addEventListener('load', disconnect);
                    }
                  } catch (e) {}
                })();
              `
            }}
          />
        </head>
        <body className={`${alexandria.variable} font-sans`} suppressHydrationWarning>
          <SWRegistration />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="tolo-theme"
          >
            <GlobalProviders>
              <FPSMonitor />
              <Suspense key="header-suspense" fallback={<div className="h-16 w-full animate-pulse bg-background" />}>
                <Header />
              </Suspense>
              {children}
            </GlobalProviders>
          </ThemeProvider>
          <ConditionalAnalytics />
          <ConditionalSpeedInsights />
        </body>
      </html>
    </ClerkProvider>

  );
}
