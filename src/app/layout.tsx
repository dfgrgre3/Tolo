"use client";

import React, { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "../components/Footer";
import Header from "../components/layout/header/Header";
import { GlobalProviders } from "../providers/index";
import NotificationsClient from "../components/NotificationsClient";
import ScrollRestoration from "../components/layout/ScrollRestoration";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
	adjustFontFallback: false,
});

function ErrorFallback({ error }: FallbackProps) {
  return (
    <div className="p-4 text-red-500">
      <h2>حدث خطأ في تحميل التطبيق</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

function useWebpackErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      if (error.message.includes('Cannot read properties of undefined') || 
          error.message.includes('call')) {
        console.error('Webpack module loading error detected:', error);
        setTimeout(() => window.location.reload(), 1000);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	useWebpackErrorHandler();
	
	const defaultLang = 'ar';
	const defaultDir = 'rtl';

	return (
		<html lang={defaultLang} dir={defaultDir}>
			<body className={`${inter.variable} antialiased`}>
				<ErrorBoundary 
					FallbackComponent={ErrorFallback}
					onError={(error: Error, info: {componentStack: string}) => {
						console.error("Layout Error:", error, info.componentStack);
					}}
				>
					<GlobalProviders>
						<div className="min-h-screen flex flex-col">
							<NotificationsClient />
							<main className="flex-1">{children}</main>
							<Footer />
						</div>
					</GlobalProviders>
				</ErrorBoundary>
			</body>
		</html>
	);
}
