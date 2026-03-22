import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "./logger";

const prismaClientSingleton = () => {
    // Get connection pooling parameters from environment
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || (process.env.NODE_ENV === 'production' ? '20' : '10');
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || '10';
    const pgbouncer = process.env.PRISMA_PGBOUNCER === 'true';

    // Construct connection string with pooling parameters if not already present
    let dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && !dbUrl.includes('connection_limit=')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl += `${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
        if (pgbouncer && !dbUrl.includes('pgbouncer=')) {
            dbUrl += '&pgbouncer=true';
        }
    }

    const client = new PrismaClient({
        datasources: {
            db: {
                url: dbUrl,
            },
        },
        log: process.env.NODE_ENV === "development" 
            ? [{ emit: "event", level: "query" }, "error", "warn"] 
            : ["error"],
    });

    if (process.env.NODE_ENV === "development") {
        (client as any).$on("query", (e: any) => {
            logger.db({
                operation: e.query,
                duration: e.duration,
                success: true,
                table: "database",
            });
        });
    }

    return client;
};

const globalForPrisma = globalThis as unknown as {
    prisma: any;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { Prisma };
export default (prisma as PrismaClient);
