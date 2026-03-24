import { PrismaClient } from '@prisma/client';
import seedTestUsers from './test-users-seed';
import seedResourcesData from './resources-seed';
import seedTeachersData from './teachers-seed';
import seedExamsData from './exams-seed';
import seedSubjectsData from './subjects-seed';
import seedAddonsData from './addons';
import seedPlansData from './plans-seed';
import seedCategoriesData from './categories-seed';
import seedAchievementsData from './achievements-seed';
import seedCouponsData from './coupons-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Start Full Seeding Process ---');

  // 1. Core Reference Data
  await seedPlansData();
  await seedSubjectsData();
  await seedCategoriesData();
  await seedAchievementsData();
  await seedAddonsData();
  await seedCouponsData(); // Added coupons

  // 2. Content and Mock Data
  await seedTeachersData();
  await seedResourcesData();
  await seedExamsData();
  await seedTestUsers();

  // 3. Final Example Entries
  console.log('Creating default resource example...');
  try {
    await prisma.resource.upsert({
      where: { id: 'math-basics-resource' },
      update: {},
      create: {
        id: 'math-basics-resource',
        subjectId: 'MATH',
        title: 'Basic Mathematics Guide',
        description: 'Introduction to basic math concepts',
        url: 'https://example.com/math-basics.pdf',
        type: 'PDF',
        free: true,
      },
    });
  } catch (err: any) {
    console.error('Failed to create default resource:', err.message);
  }

  console.log('--- Full Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });