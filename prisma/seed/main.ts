import { PrismaClient } from '@prisma/client';
import seedTestUsers from './test-users-seed';
import seedResourcesData from './resources-seed';
import seedTeachersData from './teachers-seed';
import seedExamsData from './exams-seed';

const prisma = new PrismaClient();

async function main() {
  // Add your seed data here
  console.log('Seeding...');
  
  // Seed test users (for development/testing)
  await seedTestUsers();

  // Seed resources
  await seedResourcesData();

  // Seed teachers
  await seedTeachersData();

  // Seed exams
  await seedExamsData();

  // Example: Create a default subject
  await prisma.resource.upsert({
    where: { id: 'math-basics-resource' },
    update: {},
    create: {
      id: 'math-basics-resource',
      subject: 'Mathematics',
      title: 'Basic Mathematics Guide',
      description: 'Introduction to basic math concepts',
      url: 'https://example.com/math-basics.pdf',
      type: 'PDF',
      free: true,
    },
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });