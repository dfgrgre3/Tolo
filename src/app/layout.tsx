import React from "react";
import "./globals.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { GlobalProviders } from "../providers/index";
import NotificationsClient from "../components/NotificationsClient";
import { ClientLayoutWrapper } from "../components/layout/ClientLayoutWrapper";
// import { auth } from '../auth'; // Unified auth export (server-only)
import { AuthSessionWrapper } from '../components/auth/AuthSessionWrapper';

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
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								if (typeof window === 'undefined') return;
								
								// Remove browser extension attributes that cause hydration errors
								const attributesToRemove = ['bis_skin_checked', 'bis_register'];
								
								const removeExtensionAttributes = (element) => {
									if (!element) return;
									
									// Remove specific attributes
									attributesToRemove.forEach((attr) => {
										if (element.hasAttribute && element.hasAttribute(attr)) {
											element.removeAttribute(attr);
										}
									});
									
									// Remove __processed_* attributes
									if (element.attributes) {
										Array.from(element.attributes).forEach((attr) => {
											if (attr.name.startsWith('__processed_')) {
												element.removeAttribute(attr.name);
											}
										});
									}
								};
								
								const cleanAllElements = () => {
									const allElements = document.querySelectorAll('*');
									allElements.forEach(removeExtensionAttributes);
								};
								
								// Run immediately
								cleanAllElements();
								
								// Run after DOM is ready
								if (document.readyState === 'loading') {
									document.addEventListener('DOMContentLoaded', cleanAllElements);
								} else {
									cleanAllElements();
								}
								
								// Run after React hydration with delays
								setTimeout(cleanAllElements, 0);
								setTimeout(cleanAllElements, 100);
								setTimeout(cleanAllElements, 500);
								
								// Use MutationObserver to watch for new elements
								const startObserver = () => {
									if (typeof MutationObserver === 'undefined') return;
									
									const target = document.body || document.documentElement;
									if (!target) {
										setTimeout(startObserver, 50);
										return;
									}
									
									const observer = new MutationObserver((mutations) => {
										mutations.forEach((mutation) => {
											// Handle added nodes
											mutation.addedNodes.forEach((node) => {
												if (node.nodeType === 1) { // Element node
													removeExtensionAttributes(node);
													// Also clean children
													if (node.querySelectorAll) {
														node.querySelectorAll('*').forEach(removeExtensionAttributes);
													}
												}
											});
											
											// Handle attribute changes
											if (mutation.type === 'attributes' && mutation.target) {
												removeExtensionAttributes(mutation.target);
											}
										});
									});
									
									observer.observe(target, {
										childList: true,
										subtree: true,
										attributes: true,
										attributeFilter: attributesToRemove
									});
								};
								
								// Start observer after body is ready
								if (document.body) {
									startObserver();
								} else {
									document.addEventListener('DOMContentLoaded', startObserver);
								}
							})();
						`,
					}}
				/>
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
