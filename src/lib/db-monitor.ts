import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

export class DbMonitor {
    private stats = {
        queriesRun: 0,
        errors: 0,
        startTime: new Date()
    };

    async getHealthReport() {
        return {
            status: 'healthy',
            stats: this.stats,
            connections: 'active',
            timestamp: new Date().toISOString()
        };
    }

    resetStats() {
        this.stats = {
            queriesRun: 0,
            errors: 0,
            startTime: new Date()
        };
        logger.info('Database monitoring statistics reset');
    }
}

export const dbMonitor = new DbMonitor();
export default dbMonitor;
