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
      name: 'الرياضيات',
      slug: 'math-courses',
      description: 'دورات الرياضيات التعليمية',
      icon: 'Calculator',
      type: CategoryType.COURSE,
    },
    {
      id: 'PHYSICS',
      name: 'الفيزياء',
      slug: 'physics-courses',
      description: 'دورات الفيزياء التعليمية',
      icon: 'Zap',
      type: CategoryType.COURSE,
    },
    {
      id: 'CHEMISTRY',
      name: 'الكيمياء',
      slug: 'chemistry-courses',
      description: 'دورات الكيمياء التعليمية',
      icon: 'FlaskConical',
      type: CategoryType.COURSE,
    },
    {
      id: 'ARABIC',
      name: 'اللغة العربية',
      slug: 'arabic-courses',
      description: 'دورات اللغة العربية التعليمية',
      icon: 'BookOpen',
      type: CategoryType.COURSE,
    },
    {
      id: 'ENGLISH',
      name: 'اللغة الإنجليزية',
      slug: 'english-courses',
      description: 'دورات اللغة الإنجليزية التعليمية',
      icon: 'Languages',
      type: CategoryType.COURSE,
    },
    {
      id: 'SCIENCE',
      name: 'العلوم',
      slug: 'science-courses',
      description: 'دورات العلوم التعليمية',
      icon: 'Beaker',
      type: CategoryType.COURSE,
    },
    {
      id: 'SOCIAL_STUDIES',
      name: 'الدراسات الاجتماعية',
      slug: 'social-studies-courses',
      description: 'دورات الدراسات الاجتماعية التعليمية',
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

  console.log('✓ Categories seeded successfully.');
}

export default seedCategoriesData;
