'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-16 w-16", className)}>
      {/* Outer Glow */}
      <motion.div
        className="absolute inset-[-4px] rounded-full bg-primary/20 blur-md"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut",
        }}
      />
      
      {/* Background Circle */}
      <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
      
      {/* Main Spinner Ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "linear",
        }}
      />
      
      {/* Inner Fast Ring */}
      <motion.div
        className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-primary/60 border-b-transparent border-l-transparent"
        animate={{ rotate: -360 }}
        transition={{
          repeat: Infinity,
          duration: 0.8,
          ease: "linear",
        }}
      />
      
      {/* Center Dot */}
      <motion.div
        className="absolute inset-[45%] rounded-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.8)]"
        animate={{
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/60 backdrop-blur-xl">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-[101] overflow-hidden bg-primary/10">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-orange-500 to-amber-500"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-8">
        <LoadingSpinner />
        
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent"
          >
            جاري تحضير المحتوى...
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-xs"
          >
            نحن نجهز لك تجربة تعليمية فريدة ومنظمة.
          </motion.p>
        </div>
      </div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rpg-card flex flex-col gap-4">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function UnifiedLayoutSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-10 min-h-screen animate-in fade-in duration-700">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-14 w-1/3 max-w-sm rounded-2xl" />
        <Skeleton className="h-5 w-1/2 max-w-lg rounded-xl" />
      </div>

      {/* Hero Skeleton */}
      <Skeleton className="h-[350px] w-full rounded-[2.5rem]" />

      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Content Grid */}
      <SkeletonGrid count={3} />
    </div>
  );
}
