import { NextResponse } from 'next/server';
import { AddonService } from '@/services/addon-service';
import { getRequestUserId } from '@/lib/request-auth';

export async function GET() {
  const addons = await AddonService.getAvailableAddons();
  return NextResponse.json({ addons });
}

export async function POST(req: Request) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { addonId } = await req.json();
    if (!addonId) return NextResponse.json({ error: 'Addon id is required' }, { status: 400 });

    const result = await AddonService.purchaseAddon(userId, addonId);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
