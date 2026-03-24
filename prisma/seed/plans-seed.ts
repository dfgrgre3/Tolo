import { PrismaClient, PlanInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlansData() {
  console.log('Seeding subscription plans...');
  const plans = [
    {
      id: 'free_plan',
      name: 'Free',
      nameAr: 'مجاني',
      description: 'The basic plan to get started',
      descriptionAr: 'الخطة الأساسية للبدء',
      price: 0,
      currency: 'EGP',
      interval: PlanInterval.MONTHLY,
      features: ['Access to blogs', 'Basic forum access', 'Public events'],
      featuresAr: ['الوصول للمدونات', 'وصول أساسي للمنتدى', 'الفعاليات العامة'],
      level: 0,
      aiMessageLimit: 10,
      examLimit: 2,
    },
    {
      id: 'pro_plan',
      name: 'Pro',
      nameAr: 'برو',
      description: 'Advanced features for serious students',
      descriptionAr: 'ميزات متقدمة للطلاب الطموحين',
      price: 50,
      currency: 'EGP',
      interval: PlanInterval.MONTHLY,
      features: ['Unlimited blogs', 'Priority forum support', 'All exams access', '100 AI messages'],
      featuresAr: ['مدونات غير محدودة', 'دعم منتدى ذو أولوية', 'الوصول لجميع الامتحانات', '100 رسالة ذكاء اصطناعي'],
      level: 1,
      aiMessageLimit: 100,
      examLimit: 20,
    },
    {
      id: 'elite_plan',
      name: 'Elite',
      nameAr: 'إيليت',
      description: 'Complete package with everything included',
      descriptionAr: 'الحزمة الكاملة مع كل الميزات',
      price: 150,
      currency: 'EGP',
      interval: PlanInterval.MONTHLY,
      features: ['Individual mentoring', 'Unlimited AI messages', 'Unlimited exams', 'Early access to new content'],
      featuresAr: ['توجيه فردي', 'رسائل ذكاء اصطناعي غير محدودة', 'امتحانات غير محدودة', 'وصول مبكر للمحتوى الجديد'],
      level: 2,
      aiMessageLimit: null,
      examLimit: null,
    }
  ];

  for (const plan of plans) {
    try {
      await prisma.subscriptionPlan.upsert({
        where: { id: plan.id },
        update: plan,
        create: plan,
      });
    } catch (err: any) {
      console.error(`- Failed to seed plan ${plan.name}: `, err.message)
    }
  }

  console.log('✓ Subscription plans seeded successfully.');
}

export default seedPlansData;
