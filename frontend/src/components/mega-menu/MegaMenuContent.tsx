"use client";

import React, { useCallback, useMemo } from "react";
import type { MegaMenuProps } from "./types";
import { MegaMenuContainer } from "./MegaMenuContainer";
import { MegaMenuGrid } from "./MegaMenuGrid";

export const MegaMenuContent = React.memo(function MegaMenuContent({ categories, isOpen, onClose, activeRoute }: MegaMenuProps) {
  const isCompact = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.items.length, 0) > 15,
    [categories]
  );

  const handleItemClick = useCallback(() => onClose(), [onClose]);

  if (!isOpen) return null;

  return (
    <MegaMenuContainer menuWidth="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-12">
      <MegaMenuGrid
        categories={categories}
        isCompact={isCompact}
        activeRoute={activeRoute}
        onItemClick={handleItemClick}
      />
    </MegaMenuContainer>
  );
});
