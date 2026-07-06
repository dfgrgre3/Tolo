"use client";

import { m } from "framer-motion";

interface MegaMenuBackdropProps {
	onClose: () => void;
}

export function MegaMenuBackdrop({ onClose }: MegaMenuBackdropProps) {
	return (
		<m.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-background/50 dark:bg-black/60 backdrop-blur-md z-40"
			onClick={onClose}
			aria-hidden="true"
		/>
	);
}
