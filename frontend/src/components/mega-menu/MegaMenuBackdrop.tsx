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
			transition={{ duration: 0.3 }}
			className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 backdrop-blur-xl z-40"
			onClick={onClose}
			aria-hidden="true"
		/>
	);
}
