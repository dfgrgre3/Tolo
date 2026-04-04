import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  try {
    // --- Revenue Stats ---
    const now = new Date();
    
    // Daily Revenue (Today)
    const todayRevenue = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startOfDay(now), lte: endOfDay(now) }
      },
      _sum: { amount: true }
    });

    // Monthly Revenue (This Month)
    const currentMonthRevenue = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) }
      },
      _sum: { amount: true }
    });

    // --- Chart Data (Last 6 Months) ---
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        
        const monthlySum = await prisma.payment.aggregate({
            where: {
                status: 'SUCCESS',
                createdAt: { gte: start, lte: end }
            },
            _sum: { amount: true }
        });
        
        chartData.push({
            name: monthDate.toLocaleString('ar-EG', { month: 'short' }),
            revenue: monthlySum._sum.amount || 0
        });
    }

    // --- Top Selling Plans ---
    const topPlansRaw = await prisma.payment.groupBy({
        by: ['subscriptionId'],
        where: { status: 'SUCCESS', subscriptionId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
    });

    // Process top plans to get names
    const topPlans = await Promise.all(topPlansRaw.map(async (p: any) => {
        const sub = await prisma.subscription.findUnique({
            where: { id: p.subscriptionId as string },
            include: { plan: true }
        });
        return {
            name: sub?.plan.nameAr || sub?.plan.name || 'غير معروف',
            count: p._count.id
        };
    }));

    // --- Conversion Rate ---
    // Total Checkout Visits vs Total Successful Payments
    const totalVisits = await prisma.analyticsEvent.count({
        where: { type: 'CHECKOUT_VISIT' }
    });
    
    const successfulPayments = await prisma.payment.count({
        where: { status: 'SUCCESS' }
    });

    const conversionRate = totalVisits > 0 
        ? ((successfulPayments / totalVisits) * 100).toFixed(1) 
        : "0.0";

    return NextResponse.json({
      summary: {
        today: todayRevenue._sum.amount || 0,
        thisMonth: currentMonthRevenue._sum.amount || 0,
        totalTransactions: successfulPayments,
        conversionRate: `${conversionRate}%`
      },
      chartData,
      topPlans
    });

  } catch (error) {
    logger.error('Admin Revenue Stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
