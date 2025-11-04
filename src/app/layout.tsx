import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { GlobalProviders } from "../providers/index";
import NotificationsClient from "../components/NotificationsClient";
import { ClientLayoutWrapper } from "../components/layout/ClientLayoutWrapper";
import { auth } from '../auth-server';
import { SessionProviderWrapper } from '../components/auth/SessionProviderWrapper';

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
	adjustFontFallback: false,
});

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	
	const defaultLang = 'ar';
	const defaultDir = 'rtl';

	return (
		<html lang={defaultLang} dir={defaultDir} suppressHydrationWarning>
			<body className={`${inter.variable} antialiased`} suppressHydrationWarning>
				<ClientLayoutWrapper>
					<SessionProviderWrapper session={session}>
						<GlobalProviders>
							<div className="min-h-screen flex flex-col">
								<Header />
								<NotificationsClient />
								<main className="flex-1">{children}</main>
								<Footer />
							</div>
						</GlobalProviders>
					</SessionProviderWrapper>
				</ClientLayoutWrapper>
			</body>
		</html>
	);
}
