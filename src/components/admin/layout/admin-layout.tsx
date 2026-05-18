"use client";

import * as React from "react";
import { AdminPageAccessGate } from "@/components/admin/admin-page-access-gate";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";
import { AdminHeader } from "@/components/admin/layout/admin-header";
import { CommandPalette } from "@/components/admin/ui/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Touch gestures for mobile sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0]!.clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    // Swipe left to close (when sidebar is open on mobile)
    if (diff > swipeThreshold && sidebarOpen) {
      setSidebarOpen(false);
    }

    // Swipe right to open (when near right edge)
    if (diff < -swipeThreshold && !sidebarOpen && touchStartX.current > window.innerWidth - 50) {
      setSidebarOpen(true);
    }
  };

  // Lock body scroll when sidebar is open on mobile
  React.useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <TooltipProvider>
      <div
        className="relative flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a08,transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))_40%,hsl(var(--muted)/0.25))]"
        dir="rtl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
        <CommandPalette />
        <div className="relative z-10 hidden lg:block">
          <AdminSidebar />
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <AdminSidebar />
        </div>

        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1680px] p-4 lg:p-6">
              <AdminPageAccessGate>{children}</AdminPageAccessGate>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
