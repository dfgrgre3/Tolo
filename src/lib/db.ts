import { PrismaClient, Prisma } from "@prisma/client";
import { readReplicas } from '@prisma/extension-read-replicas';
import { logger } from "./logger";
import { dbCircuitBreaker } from "./circuit-breaker";

/**
 * DB Architecture for 10M Users:
 * 1. Connection Optimization: Per-pod limits set conservatively to avoid RDS exhaustion.
 * 2. High Availability: Read-replicas offload read traffic (90% of Tolo load).
 * 3. Resilience: Circuit Breaker prevents DB-driven App crashes.
 * 4. Observability: Query performance logging in development.
 */

const prismaClientSingleton = () => {
    // Standardizing connection limits for high-density pod deployments (K8s HPA)
    // If we have 100 pods, we want total connections to stay within RDS limits (~2000 for t3.xlarge)
    const PRIMARY_LIMIT = process.env.PRISMA_CONNECTION_LIMIT || (process.env.NODE_ENV === 'production' ? '15' : '10');
    const REPLICA_LIMIT = process.env.PRISMA_REPLICA_LIMIT || (process.env.NODE_ENV === 'production' ? '10' : '5');
    const POOL_TIMEOUT = process.env.PRISMA_POOL_TIMEOUT || '10';
    const PGBOUNCER = process.env.PRISMA_PGBOUNCER === 'true';

    const buildUrl = (base: string, limit: string) => {
      if (!base) return base;
      if (base.includes('connection_limit=')) return base;
      const separator = base.includes('?') ? '&' : '?';
      let url = `${base}${separator}connection_limit=${limit}&pool_timeout=${POOL_TIMEOUT}`;
      if (PGBOUNCER && !url.includes('pgbouncer=')) url += '&pgbouncer=true';
      return url;
    };

    // 1. Primary Client (Read/Write)
    const client = new PrismaClient({
        datasources: {
            db: { url: buildUrl(process.env.DATABASE_URL || '', PRIMARY_LIMIT) },
        },
        log: process.env.NODE_ENV === "development" 
            ? [{ emit: "event", level: "query" }, "error", "warn"] 
            : ["error", "warn"],
    });

    if (process.env.NODE_ENV === "development") {
        (client as any).$on("query", (e: any) => {
            logger.db({ operation: e.query, duration: e.duration, success: true, table: "database" });
        });
    }

    // 2. HA: Implement Read-Replicas with explicit connection limits
    const replicaUrl = process.env.DATABASE_URL_REPLICA;
    
    if (replicaUrl) {
        logger.info(`DB-HA: Initializing with specialized Read Replica [Limit: ${REPLICA_LIMIT}]`);
        
        const replicaClient = new PrismaClient({
          datasources: {
            db: { url: buildUrl(replicaUrl, REPLICA_LIMIT) },
          },
        });

        // Extend with balanced read-replicas support for 10M+ users
        return client.$extends(readReplicas({
            replicas: [replicaClient],
        })) as any;
    }

    return client;
};

// Singleton Management for Next.js Fast Refresh
const globalForPrisma = globalThis as unknown as {
    prisma: any;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * DB Resilience Layer: 
 * Wrapper to execute DB calls with Circuit Breaker protection.
 * Use this for critical operations that interact with potentially stressed databases.
 */
export async function withDbCircuit<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    return dbCircuitBreaker.execute(fn, fallback);
}

export { Prisma };
export default (prisma as any);
