"use client";

import * as React from "react";
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

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <TooltipProvider>
      <div
        className="relative flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a08,transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))_40%,hsl(var(--muted)/0.25))]"
        dir="rtl"
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
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
