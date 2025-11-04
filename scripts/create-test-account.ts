import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const testEmail = 'test@example.com';
  const testPassword = 'Test123!@#';
  const testName = 'مستخدم تجريبي';

  console.log('Creating test account...');

  // Check if test user already exists
  const existing = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existing) {
    console.log('✓ Test account already exists!');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    await prisma.$disconnect();
    return;
  }

  // Hash password using bcryptjs
  const passwordHash = await bcryptjs.hash(testPassword, 12);

  // Create test user
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: testEmail,
      passwordHash,
      name: testName,
      emailVerified: true,
      emailNotifications: true,
      smsNotifications: false,
      twoFactorEnabled: false,
      biometricEnabled: false,
      biometricCredentials: [],
      totalXP: 100,
      level: 2,
      currentStreak: 5,
      longestStreak: 10,
      totalStudyTime: 3600,
      tasksCompleted: 15,
      examsPassed: 3,
      pomodoroSessions: 20,
      deepWorkSessions: 5,
      focusStrategy: 'POMODORO',
    },
  });

  console.log('✓ Test account created successfully!');
  console.log(`Email: ${testEmail}`);
  console.log(`Password: ${testPassword}`);
  console.log(`User ID: ${user.id}`);

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Error creating test account:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

