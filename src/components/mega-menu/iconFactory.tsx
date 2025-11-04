import React from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Factory function to create icon components safely for HMR
 * This prevents HMR issues with lucide-react icons by ensuring
 * icons are created in a way that's compatible with module updates
 */
export function createIcon(
	IconComponent: LucideIcon,
	className: string = "h-4 w-4"
): React.ReactElement {
	// Use React.createElement instead of JSX to ensure proper HMR handling
	return React.createElement(IconComponent, { className });
}

