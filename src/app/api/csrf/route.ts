import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function GET() {
    const token = await generateCsrfToken();
    return NextResponse.json({ csrfToken: token });
}
