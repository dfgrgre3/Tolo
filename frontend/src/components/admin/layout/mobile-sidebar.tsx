"use client";

import * as React from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTouchGestures } from "@/hooks/use-keyboard-shortcuts";

interface MobileSidebarProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  side?: "left" | "right";
}

export function MobileSidebar({
  children,
  isOpen,
  onClose,
  onOpen,
  side = "right",
}: MobileSidebarProps) {
  // Enable swipe gestures for sidebar
  useTouchGestures({
    onSwipeRight: side === "right" ? onOpen : side === "left" ? onClose : undefined,
    onSwipeLeft: side === "right" ? onClose : side === "left" ? onOpen : undefined,
  });

  // Handle body scroll lock
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 z-50"
        style={{ [side === "right" ? "right" : "left"]: "1rem" }}
        onClick={onOpen}
        data-sidebar-toggle
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{
              x: side === "right" ? "100%" : "-100%",
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: side === "right" ? "100%" : "-100%",
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
            }}
            className={cn(
              "fixed top-0 h-full w-[280px] bg-background border-l z-50 lg:hidden",
              side === "right" ? "right-0 border-l" : "left-0 border-r"
            )}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Content */}
            <div className="h-full overflow-y-auto pt-16">
              {children}
            </div>

            {/* Swipe indicator */}
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1 h-12 bg-border rounded-full",
                side === "right" ? "left-1" : "right-1"
              )}
            />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for responsive sidebar
export function useResponsiveSidebar() {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isMobile,
    isOpen,
    toggle,
    open,
    close,
  };
}

// Mobile-optimized navigation item
interface MobileNavItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: number;
}

export function MobileNavItem({
  icon,
  label,
  href,
  onClick,
  isActive,
  badge,
}: MobileNavItemProps) {
  const content = (
    <>
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className="font-medium">{label}</span>
    </>
  );

  const className = cn(
    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
    isActive
      ? "bg-primary/10 text-primary"
      : "hover:bg-muted"
  );

  if (href) {
    return (
      <a href={href} className={className} data-sidebar-item>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className} data-sidebar-item>
      {content}
    </button>
  );
}

// Bottom navigation for mobile
interface BottomNavProps {
  items: Array<{
    icon: React.ReactNode;
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
}

export function MobileBottomNav({ items }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t lg:hidden z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            onClick={(e) => {
              if (item.onClick) {
                e.preventDefault();
                item.onClick();
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full",
              item.isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
