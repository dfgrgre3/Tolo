import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
    const token = crypto.randomBytes(32).toString('hex');
    return NextResponse.json({ csrfToken: token });
}
