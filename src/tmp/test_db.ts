import { prisma } from '@/lib/db-unified';

async function test() {
  try {
    console.log('Testing DB connection and user_preferences table...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Connection OK:', result);

    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
    `;
    console.log('Tables:', tables);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit(0);
  }
}

test();
