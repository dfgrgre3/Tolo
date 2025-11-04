import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Create test/demo user accounts for development and testing
 */
async function seedTestUsers() {
  try {
    console.log('Seeding test users...');

    // Test user credentials
    const testUsers = [
      {
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'مستخدم تجريبي',
        role: 'user',
      },
      {
        email: 'demo@thanawy.com',
        password: 'Demo123!@#',
        name: 'حساب تجريبي',
        role: 'user',
      },
      {
        email: 'admin@thanawy.com',
        password: 'Admin123!@#',
        name: 'مدير النظام',
        role: 'admin',
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(userData.password, 12);

      // Create user
      await prisma.user.create({
        data: {
          id: uuidv4(),
          email: userData.email,
          passwordHash,
          name: userData.name,
          emailVerified: true, // Mark as verified for test accounts
          emailNotifications: true,
          smsNotifications: false,
          twoFactorEnabled: false,
          biometricEnabled: false,
          biometricCredentials: [],
          // Gamification defaults
          totalXP: 100,
          level: 2,
          currentStreak: 5,
          longestStreak: 10,
          totalStudyTime: 3600, // 1 hour
          tasksCompleted: 15,
          examsPassed: 3,
          pomodoroSessions: 20,
          deepWorkSessions: 5,
          focusStrategy: 'POMODORO',
        },
      });

      console.log(`✓ Created test user: ${userData.email} (Password: ${userData.password})`);
    }

    console.log('Test users seeded successfully!');
  } catch (error) {
    console.error('Error seeding test users:', error);
    throw error;
  }
}

export default seedTestUsers;

