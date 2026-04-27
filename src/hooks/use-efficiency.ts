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
      
      // Low RAM (less than 4GB)
      if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 4) {
        shouldEnable = true;
      }
      
      // Low CPU cores (less than 4)
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        shouldEnable = true;
      }

      // Mobile devices are often weaker, but we don't want to force it on high-end phones
      // though user said "weak devices", so we err on the side of caution.
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Save detection state
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
    value: { 
      isEfficiencyMode, 
      setEfficiencyMode, 
      toggleEfficiencyMode,
      isAutoDetected
    }
  }, children);
}

export function useEfficiency() {
  const context = useContext(EfficiencyContext);
  if (context === undefined) {
    throw new Error('useEfficiency must be used within an EfficiencyProvider');
  }
  return context;
}
