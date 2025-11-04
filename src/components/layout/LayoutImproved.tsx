"use client";

import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function LayoutImproved({ children, className }: LayoutProps) {

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navbar */}

      <div className="flex">

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          className
        )}>

          <div className="p-4 md:p-6 transition-all duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
