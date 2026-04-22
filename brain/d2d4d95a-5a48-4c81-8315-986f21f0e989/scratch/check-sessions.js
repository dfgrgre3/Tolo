const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.session.count();
    console.log('Session count:', count);
    const lastSession = await prisma.session.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    console.log('Last session:', JSON.stringify(lastSession, null, 2));
  } catch (error) {
    console.error('Error fetching sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
