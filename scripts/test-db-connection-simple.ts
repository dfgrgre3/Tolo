
import { prisma } from '../src/lib/db';

async function main() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Successfully connected to database!');

        // Try a simple query
        const userCount = await prisma.user.count();
        console.log(`User count: ${userCount}`);

        await prisma.$disconnect();
    } catch (e) {
        console.error('Error connecting to database:', e);
        process.exit(1);
    }
}

main();
