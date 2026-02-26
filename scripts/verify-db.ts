import { prisma } from '../src/lib/db';

async function verifyDatabase() {
    try {
        console.log('Testing connection to database...');
        // Execute a raw query to check the DB connection
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Successfully connected to the database.');
    } catch (error) {
        console.error('❌ Failed to connect to the database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verifyDatabase();
