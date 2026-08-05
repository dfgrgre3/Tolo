import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[90vh] w-full bg-slate-50 dark:bg-slate-950 py-10 flex items-center justify-center">
      <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
