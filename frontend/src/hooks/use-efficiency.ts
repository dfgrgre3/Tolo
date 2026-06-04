"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface EfficiencyContextType {
  isEfficiencyMode: boolean;
  setEfficiencyMode: (enabled: boolean) => void;
  toggleEfficiencyMode: () => void;
  isAutoDetected: boolean;
}

const EfficiencyContext = createContext<EfficiencyContextType | undefined>(undefined);

export function EfficiencyProvider({ children }: { children: React.ReactNode }) {
  const [isEfficiencyMode, setIsEfficiencyMode] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  // Check performance and preferences
  useEffect(() => {
    const checkPerformance = () => {
      if (typeof window === 'undefined') return;

      // 1. Check user preference from localStorage
      const stored = localStorage.getItem('efficiency-mode');
      if (stored !== null) {
        setIsEfficiencyMode(stored === 'true');
        return;
      }

      // 2. Check hardware-based automatic detection
      let shouldEnable = false;

      const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { effectiveType?: string; saveData?: boolean };
        mozConnection?: { effectiveType?: string; saveData?: boolean };
        webkitConnection?: { effectiveType?: string; saveData?: boolean };
      };

      // Low device memory (less than 4GB)
      if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) {
        shouldEnable = true;
      }

      // Low CPU cores (less than 4)
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        shouldEnable = true;
      }

      // Slow network connection (2g / slow-2g)
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      if (connection) {
        if (connection.saveData) {
          // User explicitly requested data saving
          shouldEnable = true;
        }
        const slowConnections = ['slow-2g', '2g'];
        if (connection.effectiveType && slowConnections.includes(connection.effectiveType)) {
          shouldEnable = true;
        }
      }

      // Mobile devices with weak hardware
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 6) {
        shouldEnable = true;
      }

      if (shouldEnable) {
        setIsEfficiencyMode(true);
        setIsAutoDetected(true);
      }
    };

    checkPerformance();
  }, []);

  // Update HTML class when mode changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    if (isEfficiencyMode) {
      document.documentElement.classList.add('efficiency-mode');
    } else {
      document.documentElement.classList.remove('efficiency-mode');
    }
    
    localStorage.setItem('efficiency-mode', String(isEfficiencyMode));
  }, [isEfficiencyMode]);

  const toggleEfficiencyMode = useCallback(() => {
    setIsEfficiencyMode(prev => !prev);
    setIsAutoDetected(false); // Manual override
  }, []);

  const setEfficiencyMode = useCallback((enabled: boolean) => {
    setIsEfficiencyMode(enabled);
    setIsAutoDetected(false); // Manual override
  }, []);

  return React.createElement(EfficiencyContext.Provider, {
    value: { isEfficiencyMode, setEfficiencyMode, toggleEfficiencyMode, isAutoDetected }
  }, children);
}

export function useEfficiency() {
  const context = useContext(EfficiencyContext);
  if (context === undefined) {
    throw new Error('useEfficiency must be used within an EfficiencyProvider');
  }
  return context;
}
