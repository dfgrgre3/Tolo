import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
	mounted: boolean;
	isMobileMenuOpen: boolean;
	setIsMobileMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function useKeyboardShortcuts({
	mounted,
	isMobileMenuOpen,
	setIsMobileMenuOpen,
}: UseKeyboardShortcutsOptions) {
	useEffect(() => {
		if (!mounted) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if typing in input/textarea
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			// Ctrl/Cmd + K for search
			if ((e.ctrlKey || e.metaKey) && e.key === "k" && !e.shiftKey && !e.altKey) {
				e.preventDefault();
				// Trigger search focus
				const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement;
				if (searchButton) {
					searchButton.click();
				}
			}

			// Escape to close mobile menu
			if (e.key === "Escape" && isMobileMenuOpen) {
				e.preventDefault();
				setIsMobileMenuOpen(false);
			}

			// Alt + M for mobile menu toggle
			if (e.altKey && e.key === "m" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
				e.preventDefault();
				setIsMobileMenuOpen((prev) => !prev);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [mounted, isMobileMenuOpen, setIsMobileMenuOpen]);
}
