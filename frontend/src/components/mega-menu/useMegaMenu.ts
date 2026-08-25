import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/user";
import type { MegaMenuCategory } from "./types";

interface UseMegaMenuProps {
  categories: MegaMenuCategory[];
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export function useMegaMenu({ categories, isOpen, onClose }: UseMegaMenuProps) {
  const router = useRouter();
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(-1);
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);

  const categoryCount = categories.length;
  const firstCategoryItemCount = categories[0]?.items.length ?? 0;

  useEffect(() => {
    queueMicrotask(() => {
      if (isOpen) {
        setFocusedCategoryIndex(categoryCount > 0 ? 0 : -1);
        setFocusedItemIndex(firstCategoryItemCount > 0 ? 0 : -1);
      } else {
        setFocusedCategoryIndex(-1);
        setFocusedItemIndex(-1);
      }
    });
  }, [isOpen, categoryCount, firstCategoryItemCount]);

  const handleArrowDown = useCallback(() => {
    if (focusedCategoryIndex === -1) {
      setFocusedCategoryIndex(0);
      setFocusedItemIndex(0);
      return;
    }
    const currentCategory = categories[focusedCategoryIndex];
    if (currentCategory && focusedItemIndex < currentCategory.items.length - 1) {
      setFocusedItemIndex(prev => prev + 1);
    } else if (focusedCategoryIndex < categories.length - 1) {
      setFocusedCategoryIndex(prev => prev + 1);
      setFocusedItemIndex(0);
    }
  }, [focusedCategoryIndex, focusedItemIndex, categories]);

  const handleArrowUp = useCallback(() => {
    if (focusedItemIndex > 0) {
      setFocusedItemIndex(prev => prev - 1);
    } else if (focusedCategoryIndex > 0) {
      const prevCategory = categories[focusedCategoryIndex - 1];
      setFocusedCategoryIndex(prev => prev - 1);
      setFocusedItemIndex(prevCategory ? prevCategory.items.length - 1 : 0);
    }
  }, [focusedCategoryIndex, focusedItemIndex, categories]);

  const handleArrowRight = useCallback(() => {
    const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    if (isRtl) {
      if (focusedCategoryIndex > 0) {
        setFocusedCategoryIndex(prev => prev - 1);
        setFocusedItemIndex(0);
      }
    } else {
      if (focusedCategoryIndex < categories.length - 1) {
        setFocusedCategoryIndex(prev => prev + 1);
        setFocusedItemIndex(0);
      }
    }
  }, [focusedCategoryIndex, categories.length]);

  const handleArrowLeft = useCallback(() => {
    const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    if (isRtl) {
      if (focusedCategoryIndex < categories.length - 1) {
        setFocusedCategoryIndex(prev => prev + 1);
        setFocusedItemIndex(0);
      }
    } else {
      if (focusedCategoryIndex > 0) {
        setFocusedCategoryIndex(prev => prev - 1);
        setFocusedItemIndex(0);
      }
    }
  }, [focusedCategoryIndex, categories.length]);

  const handleEnter = useCallback(() => {
    if (focusedCategoryIndex < 0 || focusedItemIndex < 0) return;
    const currentItem = categories[focusedCategoryIndex]?.items[focusedItemIndex];
    if (currentItem) {
      onClose();
      router.push(currentItem.href);
    }
  }, [focusedCategoryIndex, focusedItemIndex, categories, onClose, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowDown":
        e.preventDefault();
        handleArrowDown();
        break;
      case "ArrowUp":
        e.preventDefault();
        handleArrowUp();
        break;
      case "ArrowRight":
        e.preventDefault();
        handleArrowRight();
        break;
      case "ArrowLeft":
        e.preventDefault();
        handleArrowLeft();
        break;
      case "Enter":
        handleEnter();
        break;
    }
  }, [onClose, handleArrowDown, handleArrowUp, handleArrowRight, handleArrowLeft, handleEnter]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return { focusedCategoryIndex, focusedItemIndex };
}
