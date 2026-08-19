"use client";

import React, { useRef, useMemo } from "react";
import type { MegaMenuProps } from "./types";
import { useMegaMenu } from "./useMegaMenu";
import { MegaMenuContainer } from "./MegaMenuContainer";
import { MegaMenuGrid } from "./MegaMenuGrid";

export const MegaMenuContent = React.memo(function MegaMenuContent({ categories, isOpen, onClose, activeRoute, user }: MegaMenuProps) {
  const { focusedCategoryIndex, focusedItemIndex } = useMegaMenu({ categories, isOpen, onClose, user });

  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

  const gridCols = useMemo(() => {
    const count = categories.length;
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    if (count === 4) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    if (count === 5) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  }, [categories.length]);

  const isCompact = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.items.length, 0) > 15,
    [categories]
  );

  if (!isOpen) return null;

  return (
    <MegaMenuContainer menuWidth="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-12">
      <MegaMenuGrid
        categories={categories}
        gridCols={gridCols}
        isCompact={isCompact}
        focusedCategoryIndex={focusedCategoryIndex}
        focusedItemIndex={focusedItemIndex}
        onClose={onClose}
        activeRoute={activeRoute}
        setCategoryRef={(index, el) => { categoryRefs.current[index] = el; }}
      />
    </MegaMenuContainer>
  );
});
