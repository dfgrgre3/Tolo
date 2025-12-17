import { prisma } from '../src/lib/db';

async function testDatabaseConnection() {
    console.log('Testing database connection...');

    try {
        // Test connection
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connection successful:', result);

        // Try to find a user
        const users = await prisma.user.findMany({
            take: 1
        });
        console.log(`✅ Found ${users.length} users in database`);

        if (users.length > 0) {
            console.log('First user:', {
                id: users[0].id,
                email: users[0].email,
                name: users[0].name
            });
        }
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabaseConnection();
