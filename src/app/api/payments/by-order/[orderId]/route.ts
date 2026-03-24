import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    
    // Find payment by Order ID (Paymob)
    const payment = await prisma.payment.findFirst({
      where: { orderId: orderId },
      include: {
        user: {
            select: { name: true, email: true }
        },
        subscription: {
            include: { plan: true }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Fetch Payment Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
