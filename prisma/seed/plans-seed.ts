import { PrismaClient, PlanInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlansData() {
  console.log('Seeding subscription plans...');
  const plans = [
    {
      id: 'free_plan',
      name: 'Free',
      nameAr: 'ظ…ط¬ط§ظ†ظٹ',
      description: 'The basic plan to get started',
      descriptionAr: 'ط§ظ„ط®ط·ط© ط§ظ„ط£ط³ط§ط³ظٹط© ظ„ظ„ط¨ط¯ط،',
      price: 0,
      currency: 'EGP',
      interval: PlanInterval.MONTHLY,
      features: ['Access to blogs', 'Basic forum access', 'Public events'],
      featuresAr: ['ط§ظ„ظˆطµظˆظ„ ظ„ظ„ظ…ط¯ظˆظ†ط§طھ', 'ظˆطµظˆظ„ ط£ط³ط§ط³ظٹ ظ„ظ„ظ…ظ†طھط¯ظ‰', 'ط§ظ„ظپط¹ط§ظ„ظٹط§طھ ط§ظ„ط¹ط§ظ…ط©'],
      level: 0,
      aiMessageLimit: 10,
      examLimit: 2,
    },
    {
      id: 'pro_plan',
      name: 'Pro',
      nameAr: 'ط¨ط±ظˆ',
      description: 'Advanced features for serious students',
      descriptionAr: 'ظ…ظٹط²ط§طھ ظ…طھظ‚ط¯ظ…ط© ظ„ظ„ط·ظ„ط§ط¨ ط§ظ„ط·ظ…ظˆط­ظٹظ†',
      price: 50,
      currency: 'EGP',
      interval: PlanInterval.MONTHLY,
      features: ['Unlimited blogs', 'Priority forum support', 'All exams access', '100 AI messages'],
      featuresAr: ['ظ…ط¯ظˆظ†ط§طھ ط؛ظٹط± ظ…ط­ط¯ظˆط¯ط©', 'ط¯ط¹ظ… ظ…ظ†طھط¯ظ‰ ط°ظˆ ط£ظˆظ„ظˆظٹط©', 'ط§ظ„ظˆطµظˆظ„ ظ„ط¬ظ…ظٹط¹ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ', '100 ط±ط³ط§ظ„ط© ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ'],
      level: 1,
      aiMessageLimit: 100,
      examLimit: 20,
    },
    {
      id: 'elite_plan',
      name: 'Elite',
      nameAr: 'ط¥ظٹظ„ظٹطھ',
      description: 'Complete package with everything included',
      descriptionAr: 'ط§ظ„ط­ط²ظ…ط© ط§ظ„ظƒط§ظ…ظ„ط© ظ…ط¹ ظƒظ„ ط§ظ„ظ…ظٹط²ط§طھ',
      price: 150,
      currency: 'EGP',
      interval: PlanInterval.MONTHLY,
      features: ['Individual mentoring', 'Unlimited AI messages', 'Unlimited exams', 'Early access to new content'],
      featuresAr: ['طھظˆط¬ظٹظ‡ ظپط±ط¯ظٹ', 'ط±ط³ط§ط¦ظ„ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ط؛ظٹط± ظ…ط­ط¯ظˆط¯ط©', 'ط§ظ…طھط­ط§ظ†ط§طھ ط؛ظٹط± ظ…ط­ط¯ظˆط¯ط©', 'ظˆطµظˆظ„ ظ…ط¨ظƒط± ظ„ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط¬ط¯ظٹط¯'],
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

  console.log('âœ“ Subscription plans seeded successfully.');
}

export default seedPlansData;
