import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
v
import Footer from "../components/Footer";
import { AuthProvider } from "../components/auth/UserProvider";
import NotificationsClient from "../components/NotificationsClient";
import ClientLayoutProvider from "./ClientLayoutProvider";
import ToasterProvider from "../components/ui/sonner";


const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap", // Optimize font loading
	adjustFontFallback: false,
});

export const metadata: Metadata = {
	title: {
		template: '%s | ثانوية بذكاء',
		default: "ثانوية بذكاء - تنظيم وقت ونصائح"
	},
	description: "منصة شاملة لتنظيم الوقت، تتبع التقدم، الموارد، والامتحانات لثالثة ثانوي.",
	applicationName: "ThanaWy Smart",
	authors: [{ name: "ThanaWy Team" }],
	keywords: ["تعليم", "ثانوية", "تنظيم الوقت", "امتحانات", "مصر"],
	creator: "ThanaWy Team",
	publisher: "ThanaWy",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
};

function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Initialize with default values for SSR, will be updated by ClientLayout
	const defaultLang = 'ar';
	const defaultDir = 'rtl';

	return (
		<html lang={defaultLang} dir={defaultDir}>
			<body className={`${inter.variable} antialiased`}>
				<AuthProvider>
					<ClientLayoutProvider>
						<div className="min-h-screen flex flex-col">
							
							<NotificationsClient />
							<main className="flex-1">{children}</main>
							<Footer />
						</div>
					</ClientLayoutProvider>
				</AuthProvider>
			</body>
		</html>
	);
}

export default RootLayout;
