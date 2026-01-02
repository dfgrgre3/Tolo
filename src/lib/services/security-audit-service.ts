import { prisma } from '@/lib/db'

export class SecurityAuditService {
    private static instance: SecurityAuditService

    private constructor() { }

    public static getInstance(): SecurityAuditService {
        if (!SecurityAuditService.instance) {
            SecurityAuditService.instance = new SecurityAuditService()
        }
        return SecurityAuditService.instance
    }

    /**
     * Log security event
     */
    async logSecurityEvent(userId: string | null, eventType: string, ip: string, metadata: any = {}) {
        try {
            await prisma.securityLog.create({
                data: {
                    userId,
                    eventType,
                    ip: ip,
                    userAgent: metadata.userAgent || 'unknown',
                    metadata: JSON.stringify(metadata),
                },
            })
        } catch (error) {
            // Use console to avoid circular dependency with unified-logger
            console.error('Failed to log security event', error)
        }
    }
}

export const securityAuditService = SecurityAuditService.getInstance()
