import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DiscountType } from '@prisma/client';

// GET all coupons for admin
export async function GET(req: Request) {
  try {
    // Note: Middleware/Proxy handles ADMIN role check for /api/admin/*
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
          _count: {
              select: { payments: { where: { status: 'SUCCESS' } } }
          }
      }
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Admin Fetch Coupons Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new coupon
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
        code, 
        discountType, 
        discountValue, 
        description, 
        maxUses, 
        expiryDate, 
        minOrderAmount 
    } = body;

    if (!code || !discountValue) {
      return NextResponse.json({ error: 'Code and Discount Value are required' }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: discountType as DiscountType,
        discountValue: parseFloat(discountValue),
        description,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        isActive: true,
      }
    });

    return NextResponse.json(coupon);
  } catch (error: any) {
    console.error('Admin Create Coupon Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
