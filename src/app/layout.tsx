import React from "react";
import "./globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { GlobalProviders } from "@/providers/index";
import NotificationsClient from "@/components/NotificationsClient";
import AppClientRoot from "@/components/layout/AppClientRoot";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const defaultLang = 'ar';
	const defaultDir = 'rtl';

	return (
		<html lang={defaultLang} dir={defaultDir} suppressHydrationWarning>
			<head />
			<body className="antialiased" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
				<AppClientRoot>
					<GlobalProviders>
						<div className="min-h-screen flex flex-col">
							<Header />
							<NotificationsClient />
							<main className="flex-1">{children}</main>
							<Footer />
						</div>
					</GlobalProviders>
				</AppClientRoot>
			</body>
		</html>
	);
}
