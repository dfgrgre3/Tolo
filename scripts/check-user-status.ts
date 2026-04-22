
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserStatus() {
  console.log('Checking user status...');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      emailVerified: true,
      twoFactorEnabled: true,
    },
  });

  console.log(`Found ${users.length} users:`);
  console.log('-------------------------------------------------------------------');
  console.log('| Email | Verified | Role | Hash Status |');
  console.log('-------------------------------------------------------------------');

  for (const user of users) {
    let hashStatus = 'MISSING';
    if (user.passwordHash) {
      if (user.passwordHash === 'oauth_user') {
        hashStatus = 'OAuth Only';
      } else if (user.passwordHash.length > 0) {
        hashStatus = `Present (${user.passwordHash.substring(0, 7)}...)`;
      } else {
        hashStatus = 'Empty';
      }
    }

    console.log(`| ${user.email.padEnd(30)} | ${String(user.emailVerified).padEnd(8)} | ${user.role?.padEnd(6)} | ${hashStatus} |`);
  }
  console.log('-------------------------------------------------------------------');

  await prisma.$disconnect();
}

checkUserStatus().catch(console.error);
