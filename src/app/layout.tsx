import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { GlobalProviders } from "@/providers/index";
import NotificationsClient from "@/components/NotificationsClient";
import AppClientRoot from "@/components/layout/AppClientRoot";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});


export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const defaultLang = 'ar';
	const defaultDir = 'rtl';
	const devServiceWorkerCleanupScript = `
		(function () {
			if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
			navigator.serviceWorker.getRegistrations()
				.then(function (registrations) {
					registrations.forEach(function (registration) {
						registration.unregister();
					});
				})
				.catch(function () {});
			if (!("caches" in window)) return;
			caches.keys()
				.then(function (cacheNames) {
					cacheNames
						.filter(function (name) { return name.indexOf("thanawy-search") === 0; })
						.forEach(function (name) { caches.delete(name); });
				})
				.catch(function () {});
		})();
	`;

	return (
		<html lang={defaultLang} dir={defaultDir} suppressHydrationWarning>
			<head>
				{process.env.NODE_ENV !== 'production' ? (
					<script
						dangerouslySetInnerHTML={{ __html: devServiceWorkerCleanupScript }}
					/>
				) : null}
			</head>
			<body className={`${inter.variable} font-sans antialiased`}>
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
