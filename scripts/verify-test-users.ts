
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyTestUsers() {
  console.log('Verifying test users...');

  const testUsers = [
    {
      email: 'test@example.com',
      password: 'Test123!@#',
    },
    {
      email: 'demo@thanawy.com',
      password: 'Demo123!@#',
    },
    {
      email: 'admin@thanawy.com',
      password: 'Admin123!@#',
    },
  ];

  for (const userData of testUsers) {
    console.log(`\nChecking user: ${userData.email}`);

    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      console.log('❌ User not found in database');
      continue;
    }

    console.log('✓ User found');
    console.log(`  ID: ${user.id}`);
    console.log(`  Hash: ${user.passwordHash?.substring(0, 20)}...`);

    if (!user.passwordHash) {
      console.log('❌ No password hash stored');
      continue;
    }

    // Check with bcrypt (native)
    try {
      const matchNative = await bcrypt.compare(userData.password, user.passwordHash);
      console.log(`  bcrypt (native) match: ${matchNative ? '✅ YES' : '❌ NO'}`);
    } catch (e: any) {
      console.log(`  bcrypt (native) error: ${e.message}`);
    }

    // Check with bcryptjs
    try {
      const matchJs = await bcryptjs.compare(userData.password, user.passwordHash);
      console.log(`  bcryptjs match: ${matchJs ? '✅ YES' : '❌ NO'}`);
    } catch (e: any) {
      console.log(`  bcryptjs error: ${e.message}`);
    }
  }

  await prisma.$disconnect();
}

verifyTestUsers().catch(console.error);
