import React from "react";
import "./globals.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { GlobalProviders } from "../providers/index";
import NotificationsClient from "../components/NotificationsClient";
import { ClientLayoutWrapper } from "../components/layout/ClientLayoutWrapper";
import { AuthSessionWrapper } from '../components/auth/AuthSessionWrapper';
import { HydrationFix } from "@/components/utils/HydrationFix";

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// const session = await auth();
	const session = null; // Using custom auth system instead of next-auth
	
	const defaultLang = 'ar';
	const defaultDir = 'rtl';

	return (
		<html lang={defaultLang} dir={defaultDir} suppressHydrationWarning>
			<head>
				<HydrationFix />
			</head>
			<body className="antialiased" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }} suppressHydrationWarning>
				<ClientLayoutWrapper>
					<AuthSessionWrapper session={session}>
						<GlobalProviders>
							<div className="min-h-screen flex flex-col" suppressHydrationWarning>
								<Header />
								<NotificationsClient />
								<main className="flex-1" suppressHydrationWarning>{children}</main>
								<Footer />
							</div>
						</GlobalProviders>
					</AuthSessionWrapper>
				</ClientLayoutWrapper>
			</body>
		</html>
	);
}
