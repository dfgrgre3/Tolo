import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    const isDebug = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production';
    return new PrismaClient({
        log: process.env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
