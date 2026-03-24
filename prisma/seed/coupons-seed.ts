import { PrismaClient, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCouponsData() {
  console.log('Seeding coupons...');
  const coupons = [
    {
      code: 'WELCOME2026',
      description: 'First time user welcome discount',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      maxUses: 1000,
      isActive: true,
    },
    {
      code: 'STUDYHARD',
      description: 'Fixed discount for hard working students',
      discountType: DiscountType.FIXED,
      discountValue: 10,
      maxUses: 500,
      isActive: true,
    },
    {
      code: 'WINBACK50',
      description: 'Win-back coupon for inactive users',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 50,
      maxUses: 100,
      isActive: true,
      isWinBack: true,
      minInactiveDays: 30,
    }
  ];

  for (const coupon of coupons) {
    try {
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: coupon,
        create: coupon,
      });
    } catch (err: any) {
      console.error(`- Failed to seed coupon ${coupon.code}: `, err.message)
    }
  }

  console.log('✓ Coupons seeded successfully.');
}

export default seedCouponsData;
