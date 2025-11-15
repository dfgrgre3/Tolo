// Server-only auth configuration
import { logger } from '@/lib/logger';
import { authService } from '@/lib/auth-service';
import 'server-only';

// Export auth function for server-side usage
// Uses custom auth system from src/lib/auth-service.ts
export const auth = async () => {
  try {
    // Use auth-service to get current user from cookies
    const result = await authService.getCurrentUser();
    
    if (!result.isValid || !result.user) {
      return null;
    }

    // Return in format compatible with next-auth for backward compatibility
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || null,
        role: result.user.role || null,
      },
      sessionId: result.sessionId,
    };
  } catch (error) {
    logger.error('Auth error:', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Export default for backward compatibility
export default auth

