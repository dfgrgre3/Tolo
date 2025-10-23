
import { useClientEffect } from '@/hooks/use-client-effect';
import { useState } from 'react';

export function useEnvironment() {
  const [isClient, setIsClient] = useState(false);

  useClientEffect(() => {
    setIsClient(true);
  }, []);

  // Determine environment based on whether we're on client and next config
  const isDevelopment = isClient && (process.env.NODE_ENV === 'development' || 
    window.location.hostname === 'localhost');
  const isProduction = isClient && process.env.NODE_ENV === 'production';

  return {
    isClient,
    isDevelopment,
    isProduction,
  };
}
