import React from "react";

export const UserHomeSkeleton = () => {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-pulse bg-[#0A0A0F] min-h-screen" dir="rtl">
      {/* Hero Skeleton */}
      <div className="h-[500px] w-full rounded-[2.5rem] bg-white/5 border border-white/10 p-8">
        <div className="flex flex-col items-center gap-8 mb-12">
          <div className="h-10 w-48 bg-white/10 rounded-full"></div>
          <div className="h-20 w-[80%] bg-white/10 rounded-2xl"></div>
          <div className="h-12 w-96 bg-white/10 rounded-xl"></div>
          <div className="h-24 w-48 bg-white/10 rounded-3xl mt-4"></div>
        </div>
        <div className="h-32 w-full max-w-4xl mx-auto rounded-3xl bg-white/10"></div>
      </div>

      {/* Main Vertical Content Skeleton */}
      <div className="max-w-5xl mx-auto w-full space-y-12">
        {/* Quick Links Skeleton */}
        <div className="space-y-6">
           <div className="h-10 w-64 bg-white/5 rounded-lg"></div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-white/5 border border-white/10"></div>
             ))}
           </div>
        </div>

        {/* Analytics/Performance Skeleton */}
        <div className="h-96 w-full rounded-[2rem] bg-white/5 border border-white/10"></div>
        
        {/* Exams Skeleton */}
        <div className="h-[600px] w-full rounded-[2rem] bg-white/5 border border-white/10 p-10">
           <div className="w-full flex flex-col items-center gap-6 mb-12">
             <div className="h-16 w-16 rounded-full bg-white/10"></div>
             <div className="h-12 w-96 bg-white/10 rounded-xl"></div>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
             {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="h-40 rounded-2xl bg-white/5 border border-white/10"></div>
             ))}
           </div>
        </div>

        {/* Intelligence Sections */}
        <div className="space-y-12">
           <div className="h-96 w-full rounded-[2rem] bg-white/5 border border-white/10"></div>
           <div className="h-80 w-full rounded-[2rem] bg-white/5 border border-white/10"></div>
        </div>
      </div>
    </div>
  );
};
