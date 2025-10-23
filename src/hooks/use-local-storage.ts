import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for safely accessing localStorage with server-client synchronization.
 * This hook ensures that components render the same content on both server and client
 * during initial hydration, preventing mismatches.
 * 
 * @param key The localStorage key to use
 * @param initialValue The initial value to use if no value is found in localStorage
 * @returns A tuple containing the current value and a function to update it
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  
  // State to track if component has mounted (hydration completed)
  const [isMounted, setIsMounted] = useState(false);

  // Function to update both state and localStorage
  const setValue: (value: T | ((prevValue: T) => T)) => void = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to localStorage only on client side
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Initialize the state with localStorage value after component mounts
  useEffect(() => {
    // Set isMounted to true to indicate component has been mounted
    setIsMounted(true);
    
    try {
      // Get from localStorage only on client side
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // If not mounted, return initial value to avoid hydration mismatch
  // Otherwise, return the stored value
  const returnValue = isMounted ? storedValue : initialValue;

  return [returnValue, setValue];
}