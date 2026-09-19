"use client";

import React, { useCallback } from "react";
import type { MegaMenuCategory } from "./types";
import { MegaMenuContainer } from "./MegaMenuContainer";
import { MegaMenuGrid } from "./MegaMenuGrid";

interface MegaMenuContentProps {
  categories: MegaMenuCategory[];
  onClose: () => void;
  activeRoute?: (href: string) => boolean;
}

/**
 * Renders the menu body. Mounting is owned by MegaMenu: it keeps this
 * component in the DOM for the duration of the close animation, so the
 * fade-out actually animates content instead of an empty shell.
 */
export const MegaMenuContent = React.memo(function MegaMenuContent({
  categories,
  onClose,
  activeRoute
}: MegaMenuContentProps) {
  const handleItemClick = useCallback(() => onClose(), [onClose]);

  return (
    <MegaMenuContainer menuWidth="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-12">
      <MegaMenuGrid
        categories={categories}
        activeRoute={activeRoute}
        onItemClick={handleItemClick}
      />
    </MegaMenuContainer>
  );
});
