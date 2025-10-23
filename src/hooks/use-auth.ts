"use client";

import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';

export function useAuth() {
  try {
    const context = useContext(AuthContext);
    
    if (context === undefined) {
      // Return default values instead of throwing an error
      return {
        user: null,
        isLoading: false,
        login: () => {},
        logout: () => {},
        updateUser: () => {},
        refreshUser: async () => {}
      };
    }
    
    return context;
  } catch (error) {
    // Return default values if there's any error
    return {
      user: null,
      isLoading: false,
      login: () => {},
      logout: () => {},
      updateUser: () => {},
      refreshUser: async () => {}
    };
  }
}
