
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function testSessionCreation() {
  console.log('Testing session creation...');

  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('❌ No user found to create session for');
    return;
  }

  console.log(`Using user: ${user.email} (${user.id})`);

  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    console.log('Creating session...');
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        userAgent: 'Test Script',
        ip: '127.0.0.1',
        expiresAt: expiresAt
      }
    });

    console.log('✅ Session created successfully:');
    console.log(session);

    console.log('Deleting session...');
    await prisma.session.delete({
      where: { id: sessionId }
    });
    console.log('✅ Session deleted successfully');

  } catch (error) {
    console.error('❌ Error creating session:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSessionCreation().catch(console.error);
