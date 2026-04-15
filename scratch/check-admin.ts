import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkUser() {
  const email = 'admin@thanawy.com';
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`User ${email} does not exist. Creating...`);
    const password = 'Admin123!@#';
    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'System Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      },
    });
    console.log(`User ${email} created successfully.`);
    return;
  }

  console.log(`User found: ${user.email}, Role: ${user.role}, Status: ${user.status}`);
  
  // Reset password to the provided one: Admin123!@#
  const password = 'Admin123!@#';
  const passwordHash = await bcrypt.hash(password, 10);
  
  await prisma.user.update({
    where: { email },
    data: { 
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true
    },
  });

  console.log(`Password reset for ${email} successfully.`);
}

checkUser()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
