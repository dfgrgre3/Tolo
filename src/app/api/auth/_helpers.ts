import { logger } from '@/lib/logger';
import { securityAuditService } from '@/lib/services/security-audit-service';

// Re-export everything from auth-utils
export * from '@/lib/auth-utils';

// Re-export schemas from validations
export {
  resetTokenSchema,
  passwordSchema,
  emailSchema,
  magicLinkSchema,
} from '@/lib/validations/auth';

/**
 * Safe security event logger with timeout protection
 * Wraps security event logging to prevent failures from breaking the flow
 * REFACTORED: Now uses securityAuditService directly to avoid circular dependency with auth-service
 */
export async function logSecurityEventSafely(
  userId: string | null,
  eventType: string,
  metadata: {
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
  } = {}
): Promise<void> {
  // Validate inputs
  if (eventType && typeof eventType !== 'string') {
    logger.warn('Invalid eventType provided to logSecurityEventSafely');
    return;
  }

  if (userId !== null && (typeof userId !== 'string' || userId.trim().length === 0)) {
    logger.warn('Invalid userId provided to logSecurityEventSafely');
    return;
  }

  // Sanitize metadata
  const sanitizedMetadata: { ip?: string; userAgent?: string;[key: string]: unknown } = {};
  if (metadata.ip && typeof metadata.ip === 'string') {
    sanitizedMetadata.ip = metadata.ip.trim().slice(0, 100);
  }
  if (metadata.userAgent && typeof metadata.userAgent === 'string') {
    sanitizedMetadata.userAgent = metadata.userAgent.trim().slice(0, 500);
  }

  // Limit metadata size to prevent DoS
  const metadataKeys = Object.keys(metadata).slice(0, 50);
  for (const key of metadataKeys) {
    if (key !== 'ip' && key !== 'userAgent') {
      const value = metadata[key];
      if (typeof value === 'string') {
        sanitizedMetadata[key] = value.slice(0, 1000);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedMetadata[key] = value;
      }
    }
  }

  try {
    // Add timeout protection
    const logPromise = securityAuditService.logSecurityEvent(
      userId,
      eventType,
      sanitizedMetadata.ip || 'unknown',
      {
        userAgent: sanitizedMetadata.userAgent || 'unknown',
        ...sanitizedMetadata,
      }
    );

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        logger.warn('Security event logging timeout');
        resolve();
      }, 3000); // 3 second timeout
    });

    await Promise.race([logPromise, timeoutPromise]);
  } catch (error) {
    // Don't fail the request if logging fails, but log the error
    logger.error('Failed to log security event:', error);
  }
}
