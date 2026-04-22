import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@thanawy.app';
  const adminPassword = 'Admin@123456';
  const adminName = 'ط§ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ…';

  console.log('--- ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ ط§ظ„ظ…ط³ط¤ظˆظ„ ---');

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log('! ط­ط³ط§ط¨ ط§ظ„ظ…ط³ط¤ظˆظ„ ظ…ظˆط¬ظˆط¯ ط¨ط§ظ„ظپط¹ظ„.');
    
    // Ensure it has the ADMIN role
    if (existing.role !== 'ADMIN') {
      console.log('طھط­ط¯ظٹط« ط¯ظˆط± ط§ظ„ظ…ط³طھط®ط¯ظ… ط¥ظ„ظ‰ ظ…ط³ط¤ظˆظ„ (ADMIN)...');
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' },
      });
      console.log('âœ“ طھظ… طھط­ط¯ظٹط« ط§ظ„ط¯ظˆط± ط¨ظ†ط¬ط§ط­.');
    } else {
      console.log('âœ“ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ‡ظˆ ظ…ط³ط¤ظˆظ„ ط¨ط§ظ„ظپط¹ظ„.');
    }

    // Inform about resetting password if needed
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword} (ط¥ط°ط§ ظ„ظ… ظٹطھظ… طھط؛ظٹظٹط±ظ‡ ظ…ط³ط¨ظ‚ط§ظ‹)`);
    await prisma.$disconnect();
    return;
  }

  // Hash password
  const passwordHash = await bcryptjs.hash(adminPassword, 12);

  // Create admin user
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: adminEmail,
      username: 'admin',
      passwordHash,
      name: adminName,
      role: 'ADMIN',
      emailVerified: true,
      twoFactorEnabled: false,
      xp: {
        create: {
          totalXP: 1000,
          level: 10,
        }
      },
    },
  });

  console.log('âœ“ طھظ… ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨ ط§ظ„ظ…ط³ط¤ظˆظ„ ط¨ظ†ط¬ط§ط­!');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`User ID: ${user.id}`);

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Error creating admin account:', error);
    process.exit(1);
  });
