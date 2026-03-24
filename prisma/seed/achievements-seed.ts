import { PrismaClient, AchievementCategory, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAchievementsData() {
  console.log('Seeding achievements...');
  const achievements = [
    {
      id: 'first_subject',
      key: 'first_subject',
      title: 'First Step',
      description: 'Enrolled in your first subject',
      icon: 'Book',
      xpReward: 50,
      category: AchievementCategory.STUDY,
      difficulty: Difficulty.EASY,
      requirements: '{}',
    },
    {
      id: 'seven_day_streak',
      key: 'seven_day_streak',
      title: 'Consistent Student',
      description: 'Studied for 7 days in a row',
      icon: 'Flame',
      xpReward: 150,
      category: AchievementCategory.STREAK,
      difficulty: Difficulty.MEDIUM,
      requirements: '{}',
    },
    {
      id: 'exam_master',
      key: 'exam_master',
      title: 'Exam Master',
      description: 'Passed 10 exams with a score above 90%',
      icon: 'Trophy',
      xpReward: 500,
      category: AchievementCategory.EXAMS,
      difficulty: Difficulty.HARD,
      requirements: '{}',
    },
    {
      id: 'pomodoro_lover',
      key: 'pomodoro_lover',
      title: 'Focus Expert',
      description: 'Completed 50 pomodoro sessions',
      icon: 'Timer',
      xpReward: 200,
      category: AchievementCategory.TIME,
      difficulty: Difficulty.MEDIUM,
      requirements: '{}',
    }
  ];

  for (const achievement of achievements) {
    try {
      await prisma.achievement.upsert({
        where: { key: achievement.key },
        update: achievement,
        create: achievement,
      });
    } catch (err: any) {
      console.error(`- Failed to seed achievement ${achievement.title}: `, err.message)
    }
  }

  console.log('✓ Achievements seeded successfully.');
}

export default seedAchievementsData;
