import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[90vh] w-full overflow-hidden bg-slate-50/40 dark:bg-slate-950/20 py-10 flex items-center justify-center">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Soft glowing mesh circles */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-orange-400/20 to-amber-500/20 blur-3xl dark:from-orange-500/10 dark:to-amber-600/10 animate-pulse duration-[8s]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-purple-400/20 to-indigo-500/20 blur-3xl dark:from-purple-600/10 dark:to-indigo-700/10 animate-pulse duration-[10s]" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-pink-500/10 blur-[100px] dark:bg-pink-500/5" />
        
        {/* Subtle grid pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05]" />
      </div>

      <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </div>
    </div>
  );
}
