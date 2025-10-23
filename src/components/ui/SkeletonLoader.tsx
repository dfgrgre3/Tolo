"use client";

import { memo } from "react";

interface SkeletonLoaderProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader = memo(({ className = "", style }: SkeletonLoaderProps) => {
  return (
    <div 
      className={`bg-gray-200 animate-pulse rounded-lg ${className}`}
      style={style}
    />
  );
});

SkeletonLoader.displayName = "SkeletonLoader";