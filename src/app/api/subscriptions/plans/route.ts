import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    let plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    // If no plans in DB, return some defaults (or seed them)
    if (plans.length === 0) {
      plans = [
        {
          id: 'basic-plan',
          name: 'الباقة الأساسية',
          nameAr: 'الباقة الأساسية',
          description: 'الوصول إلى المواد التعليمية الأساسية',
          descriptionAr: 'الوصول إلى المواد التعليمية الأساسية',
          price: 50,
          currency: 'EGP',
          interval: 'MONTHLY',
          features: ['Access to all video lessons', 'Downloadable PDFs'],
          featuresAr: ['الوصول لجميع فيديوهات الشرح', 'تحميل ملازم بصيغة PDF'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pro-plan',
          name: 'الباقة الاحترافية',
          nameAr: 'الباقة الاحترافية',
          description: 'شاملة الاختبارات والتقييمات الذكية',
          descriptionAr: 'شاملة الاختبارات والتقييمات الذكية',
          price: 150,
          currency: 'EGP',
          interval: 'MONTHLY',
          features: ['All Basic features', 'AI-generated exams', 'Progress Tracking'],
          featuresAr: ['جميع مميزات الباقة الأساسية', 'امتحانات مولدة بالذكاء الاصطناعي', 'متابعة مستوى متقدمة'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ] as any;
    }

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Fetch Plans Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
