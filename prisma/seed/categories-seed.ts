import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCategoriesData() {
  console.log('Seeding categories...');
  const categories = [
    {
      name: 'General Tips',
      slug: 'general-tips',
      description: 'General study tips and guides',
      type: CategoryType.BLOG,
    },
    {
      name: 'Subject Help',
      slug: 'subject-help',
      description: 'Help with specific subjects',
      type: CategoryType.FORUM,
    },
    {
      name: 'Exams & Results',
      slug: 'exams-results',
      description: 'Information about official exams',
      type: CategoryType.BLOG,
    },
    {
        name: 'Success Stories',
        slug: 'success-stories',
        description: 'Stories from previous students',
        type: CategoryType.BLOG,
    }
  ];

  for (const category of categories) {
    try {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      });
    } catch (err: any) {
      console.error(`- Failed to seed category ${category.name}: `, err.message)
    }
  }

  console.log('✓ Categories seeded successfully.');
}

export default seedCategoriesData;
