import { prisma } from '@/lib/db';

export class FeatureGate {
    /**
     * Check if a user has access to a resource based on its minimum plan level
     */
    static async canAccess(userId: string, minRequiredLevel: number) {
        if (minRequiredLevel === 0) return true; // Free for everyone

        // 1. Check if user has an ACTIVE subscription
        const userSubscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                endDate: { gte: new Date() }
            },
            include: { plan: true }
        });

        // 2. Check if user is part of an active Group Subscription
        const groupSubscription = await prisma.groupSubscription.findFirst({
            where: {
                isActive: true,
                OR: [
                    { ownerId: userId },
                    { members: { some: { id: userId } } }
                ]
            },
            include: { owner: { select: { subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } } } } }
        });

        // Get max level from either direct or group subscription
        let userMaxLevel = 0;
        if (userSubscription?.plan?.level) {
            userMaxLevel = Math.max(userMaxLevel, userSubscription.plan.level);
        }
        
        // Group members get the level of the group owner's subscription
        if (groupSubscription?.owner?.subscriptions?.[0]?.plan?.level) {
            userMaxLevel = Math.max(userMaxLevel, groupSubscription.owner.subscriptions[0].plan.level);
        }

        return userMaxLevel >= minRequiredLevel;
    }
}
