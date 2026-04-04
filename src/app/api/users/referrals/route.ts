import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralRewards: {
          include: { referrer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { referrals: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get referral rewards where this user is the referrer
    const rewards = await prisma.referralReward.findMany({
        where: { referrerId: userId },
        include: { 
            referrer: { select: { name: true } }, 
            // We need to fetch the referred user info separately since we didn't add the relation back in schema correctly 
            // Wait, I should add a referred relation in ReferralReward
        },
        orderBy: { createdAt: 'desc' }
    });

    // Let's refine the schema to be better, but for now I'll just fetch based on referredId 
    const history = await Promise.all(rewards.map(async (r: any) => {
        const referred = await prisma.user.findUnique({
            where: { id: r.referredId },
            select: { name: true, email: true }
        });
        return { ...r, referred };
    }));

    const totalEarned = rewards.reduce((sum: number, r: any) => sum + r.amount, 0);

    return NextResponse.json({
        referralCode: user.referralCode,
        referralCount: user._count.referrals,
        totalEarned,
        pendingRewards: 0, // In this system it's immediate
        history
    });
  } catch (error) {
    logger.error('Fetch Referrals Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
