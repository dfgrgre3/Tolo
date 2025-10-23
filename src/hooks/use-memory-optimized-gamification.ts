"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useGamification } from './use-gamification';
import { firestoreService } from '@/lib/firestore-service';

interface UseMemoryOptimizedGamificationOptions {
  userId: string;
  enableRealTime?: boolean;
  enableNotifications?: boolean;
  cleanupDelay?: number; // Delay before cleanup in ms
}

/**
 * Memory-optimized version of useGamification hook
 * Automatically manages Firestore listeners and cleans them up properly
 */
export function useMemoryOptimizedGamification({
  userId,
  enableRealTime = true,
  enableNotifications = true,
  cleanupDelay = 1000
}: UseMemoryOptimizedGamificationOptions) {

  // Track if component is mounted
  const isMountedRef = useRef(true);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<string[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    // Clean up all listeners for this user
    firestoreService.cleanupUserListeners(userId);

    // Clear the listeners tracking
    listenersRef.current = [];

    console.log(`Cleaned up gamification listeners for user: ${userId}`);
  }, [userId]);

  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Delay cleanup to prevent issues with rapid mount/unmount cycles
      cleanupTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          cleanup();
        }
      }, cleanupDelay);
    };
  }, [cleanup, cleanupDelay]);

  // Cancel cleanup if component remounts quickly
  useEffect(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  });

  // Use the base gamification hook
  const gamification = useGamification({
    userId,
    enableRealTime,
    enableNotifications
  });

  // Enhanced cleanup function that tracks listeners
  const enhancedCleanup = useCallback(() => {
    cleanup();
    gamification.clearAchievementNotification();
  }, [cleanup, gamification]);

  // Track active listeners for debugging
  const getActiveListeners = useCallback(() => {
    return firestoreService.getActiveListeners();
  }, []);

  const getListenerCount = useCallback(() => {
    return firestoreService.getActiveListenerCount();
  }, []);

  return {
    ...gamification,
    cleanup: enhancedCleanup,
    getActiveListeners,
    getListenerCount,
    isMounted: isMountedRef.current
  };
}
