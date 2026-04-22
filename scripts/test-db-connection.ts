import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing database connection...');
        const userCount = await prisma.user.count();
        console.log('Connection successful!');
        console.log(`Total users in database: ${userCount}`);
        
        // Check for any model with potential issues
        const subjects = await prisma.subject.findMany({ take: 1 });
        console.log('Subject query successful');
        
    } catch (error) {
        console.error('Database connection failed:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
