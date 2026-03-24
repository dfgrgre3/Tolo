import { prisma } from '@/lib/db';

export class GroupBillingService {
  /**
   * Create or update a group subscription for a user
   */
  static async setupGroup(ownerId: string, planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.memberLimit <= 1) {
      throw new Error('This plan does not support group subscriptions.');
    }

    return await prisma.groupSubscription.upsert({
      where: { ownerId },
      update: { planId, isActive: true },
      create: { ownerId, planId, isActive: true }
    });
  }

  /**
   * Add a member to a group subscription
   */
  static async addMember(ownerId: string, email: string) {
    const group = await prisma.groupSubscription.findUnique({
      where: { ownerId },
      include: { 
          members: true, 
          owner: { include: { subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } } } } 
      }
    });

    if (!group || !group.isActive) {
      throw new Error('No active group subscription found for this account.');
    }

    const plan = group.owner?.subscriptions?.[0]?.plan;
    if (!plan) {
      throw new Error('No active plan found for the group owner.');
    }

    if (group.members.length >= plan.memberLimit - 1) { // -1 because owner is also a member/admin
      throw new Error(`Group limit reached (${plan.memberLimit} members including owner).`);
    }

    const memberUser = await prisma.user.findUnique({ where: { email } });
    if (!memberUser) {
      throw new Error('User not found. They must have an account first.');
    }

    return await prisma.groupSubscription.update({
      where: { id: group.id },
      data: { members: { connect: { id: memberUser.id } } }
    });
  }
}
