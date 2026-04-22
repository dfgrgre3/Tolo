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
    },
    {
      id: 'MATH',
      name: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ',
      slug: 'math-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ط±ظٹط§ط¶ظٹط§طھ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'Calculator',
      type: CategoryType.COURSE,
    },
    {
      id: 'PHYSICS',
      name: 'ط§ظ„ظپظٹط²ظٹط§ط،',
      slug: 'physics-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ظپظٹط²ظٹط§ط، ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'Zap',
      type: CategoryType.COURSE,
    },
    {
      id: 'CHEMISTRY',
      name: 'ط§ظ„ظƒظٹظ…ظٹط§ط،',
      slug: 'chemistry-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ظƒظٹظ…ظٹط§ط، ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'FlaskConical',
      type: CategoryType.COURSE,
    },
    {
      id: 'ARABIC',
      name: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©',
      slug: 'arabic-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'BookOpen',
      type: CategoryType.COURSE,
    },
    {
      id: 'ENGLISH',
      name: 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©',
      slug: 'english-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط© ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'Languages',
      type: CategoryType.COURSE,
    },
    {
      id: 'SCIENCE',
      name: 'ط§ظ„ط¹ظ„ظˆظ…',
      slug: 'science-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ط¹ظ„ظˆظ… ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'Beaker',
      type: CategoryType.COURSE,
    },
    {
      id: 'SOCIAL_STUDIES',
      name: 'ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط©',
      slug: 'social-studies-courses',
      description: 'ط¯ظˆط±ط§طھ ط§ظ„ط¯ط±ط§ط³ط§طھ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹط© ط§ظ„طھط¹ظ„ظٹظ…ظٹط©',
      icon: 'Globe',
      type: CategoryType.COURSE,
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

  console.log('âœ“ Categories seeded successfully.');
}

export default seedCategoriesData;
