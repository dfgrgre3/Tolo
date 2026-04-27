import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@thanawy.com';
  const adminPassword = 'Admin@123456';
  const adminName = 'المدير العام';

  console.log('--- إنشاء حساب المسؤول ---');

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log('! حساب المسؤول موجود بالفعل.');
    
    // Ensure it has the ADMIN role
    if (existing.role !== 'ADMIN') {
      console.log('تحديث دور المستخدم إلى مسؤول (ADMIN)...');
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'ADMIN' },
      });
      console.log('âœ“ تم تحديث الدور بنجاح.');
    } else {
      console.log('âœ“ المستخدم هو مسؤول بالفعل.');
    }

    // Inform about resetting password if needed
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword} (إذا لم يتم تغييره مسبقاً)`);
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

  console.log('âœ“ تم إنشاء حساب المسؤول بنجاح!');
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
