import { prisma } from '@/lib/prisma';

async function test() {
  try {
    const userId = "test-user-id"; // Dummy ID
    console.log('Testing user_preferences query...');
    
    // Test if we can create the table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_preferences_test" (
        "userId" TEXT PRIMARY KEY,
        "appearance" TEXT NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Table creation test OK');

    const result = await prisma.$queryRaw`SELECT * FROM "user_preferences_test" LIMIT 1`;
    console.log('Query OK:', result);

    await prisma.$executeRawUnsafe(`DROP TABLE "user_preferences_test"`);
    console.log('Drop OK');

  } catch (err) {
    console.error('Test FAILED:', err);
  } finally {
    process.exit(0);
  }
}

test();
