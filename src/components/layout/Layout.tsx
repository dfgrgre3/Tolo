"use client";

import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function Layout({ 
  children, 
  className,
  containerClassName,
  maxWidth = "full"
}: LayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full"
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navbar */}

      <div className="flex">

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out w-full",
          className
        )}>

          <div className={cn(
            "mx-auto w-full transition-all duration-300",
            "px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10",
            "py-4 sm:py-6 md:py-8 lg:py-10",
            maxWidthClasses[maxWidth],
            containerClassName
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Export Layout as default for backward compatibility
export default Layout;
