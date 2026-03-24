import { PrismaClient, AddonType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAddonsData() {
  console.log('Seeding addons...');
  const addons = [
    {
      name: 'pack_10_exams',
      nameAr: 'حزمة 10 امتحانات',
      description: 'حزمة إضافية تتيح لك دخول 10 امتحانات إضافية',
      price: 20,
      type: AddonType.EXAM_PACK,
      value: 10,
    },
    {
        name: 'ai_100_msgs',
        nameAr: '100 رسالة ذكاء اصطناعي',
        description: 'رصيد إضافي لـ 100 رسالة مع المساعد الذكي',
        price: 15,
        type: AddonType.AI_CREDITS,
        value: 100,
    },
    {
        name: 'teacher_1_hour',
        nameAr: 'ساعة تدريب مع مدرس',
        description: 'ساعة دعم وتوجيه مباشرة مع مدرس متخصص',
        price: 100,
        type: AddonType.TEACHER_HOURS,
        value: 1,
    }
  ];

  for (const addon of addons) {
    try {
      await prisma.addon.upsert({
        where: { name: addon.name },
        update: addon,
        create: addon,
      });
    } catch (err: any) {
      console.error(`- Failed to seed addon ${addon.name}: `, err.message)
    }
  }

  console.log('✓ Addons seeded successfully.');
}

export default seedAddonsData;
