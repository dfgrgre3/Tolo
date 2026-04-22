import { PrismaClient, Prisma } from "@prisma/client";
import { readReplicas } from '@prisma/extension-read-replicas';
import { logger } from "./logger";
import { dbCircuitBreaker } from "./circuit-breaker";

/**
 * DB Architecture for 10M Users:
 * 1. Connection Optimization: Per-pod limits set conservatively to avoid RDS exhaustion.
 * 2. High Availability: Read-replicas offload read traffic (90% of load).
 * 3. Resilience: Circuit Breaker prevents DB-driven App crashes.
 * 4. Observability: Query performance logging.
 */

const prismaClientSingleton = () => {
    const PRIMARY_LIMIT = process.env.PRISMA_CONNECTION_LIMIT || (process.env.NODE_ENV === 'production' ? '20' : '10');
    const REPLICA_LIMIT = process.env.PRISMA_REPLICA_LIMIT || (process.env.NODE_ENV === 'production' ? '15' : '5');
    const POOL_TIMEOUT = process.env.PRISMA_POOL_TIMEOUT || '15';
    const PGBOUNCER = process.env.PRISMA_PGBOUNCER === 'true';

    const buildUrl = (base: string, limit: string) => {
      if (!base) return base;
      if (base.includes('connection_limit=')) return base;
      const separator = base.includes('?') ? '&' : '?';
      let url = `${base}${separator}connection_limit=${limit}&pool_timeout=${POOL_TIMEOUT}`;
      if (PGBOUNCER && !url.includes('pgbouncer=')) url += '&pgbouncer=true';
      return url;
    };

    const client = new PrismaClient({
        datasources: {
            db: { url: buildUrl(process.env.DATABASE_URL || '', PRIMARY_LIMIT) },
        },
        log: process.env.NODE_ENV === "development" 
            ? [{ emit: "event", level: "query" }, "error", "warn"] 
            : ["error", "warn"],
    });

    if (process.env.NODE_ENV === "development") {
        (client as any).$on("query" as any, (e: any) => {
            const isSystemQuery = e.query.includes('pg_') || 
                                 e.query.includes('SELECT NOW()') || 
                                 e.query.includes('SELECT 1') ||
                                 e.query.includes('current_database()');
            
            if (!isSystemQuery) {
                logger.db({ operation: e.query, duration: e.duration, success: true, table: "database" });
            }
        });
    }

    const replicaUrl = process.env.DATABASE_URL_REPLICA;
    
    if (replicaUrl) {
        logger.info(`DB-HA: Initializing with Read Replica [Limit: ${REPLICA_LIMIT}]`);
        
        const replicaClient = new PrismaClient({
          datasources: {
            db: { url: buildUrl(replicaUrl, REPLICA_LIMIT) },
          },
        });

        return client.$extends(readReplicas({
            replicas: [replicaClient],
        }));
    }

    return client;
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: ExtendedPrismaClient | undefined;
};

/**
 * Shared Prisma instance with Read-Replica and Query Logging support.
 */
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * DB Resilience Layer: 
 * Wrapper to execute DB calls with Circuit Breaker protection.
 */
export async function withDbCircuit<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    return dbCircuitBreaker.execute(fn, fallback);
}

export { Prisma };
export default prisma;
