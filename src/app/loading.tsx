import React from 'react';
import { UnifiedLayoutSkeleton } from '@/components/ui/loading-state';

/**
 * Root Loading Component
 * 
 * Uses an inline skeleton layout instead of a fixed overlay
 * to prevent the loading screen from permanently blocking page content.
 */
export default function Loading() {
  return <UnifiedLayoutSkeleton />;
}
