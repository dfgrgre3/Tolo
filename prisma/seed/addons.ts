import { PrismaClient, AddonType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAddonsData() {
  console.log('Seeding addons...');
  const addons = [
    {
      name: 'pack_10_exams',
      nameAr: 'ط­ط²ظ…ط© 10 ط§ظ…طھط­ط§ظ†ط§طھ',
      description: 'ط­ط²ظ…ط© ط¥ط¶ط§ظپظٹط© طھطھظٹط­ ظ„ظƒ ط¯ط®ظˆظ„ 10 ط§ظ…طھط­ط§ظ†ط§طھ ط¥ط¶ط§ظپظٹط©',
      price: 20,
      type: AddonType.EXAM_PACK,
      value: 10,
    },
    {
        name: 'ai_100_msgs',
        nameAr: '100 ط±ط³ط§ظ„ط© ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ',
        description: 'ط±طµظٹط¯ ط¥ط¶ط§ظپظٹ ظ„ظ€ 100 ط±ط³ط§ظ„ط© ظ…ط¹ ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ',
        price: 15,
        type: AddonType.AI_CREDITS,
        value: 100,
    },
    {
        name: 'teacher_1_hour',
        nameAr: 'ط³ط§ط¹ط© طھط¯ط±ظٹط¨ ظ…ط¹ ظ…ط¯ط±ط³',
        description: 'ط³ط§ط¹ط© ط¯ط¹ظ… ظˆطھظˆط¬ظٹظ‡ ظ…ط¨ط§ط´ط±ط© ظ…ط¹ ظ…ط¯ط±ط³ ظ…طھط®طµطµ',
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

  console.log('âœ“ Addons seeded successfully.');
}

export default seedAddonsData;
