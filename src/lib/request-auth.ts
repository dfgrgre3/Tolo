import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dfgrgre3-thanawy-secure-token-2026-v1-secret-key'
);

type RequestLike = Request | NextRequest;

function readHeader(headers: Headers, name: string) {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}

export async function getRequestUserId(req: RequestLike): Promise<string | null> {
  const headerUserId = readHeader(req.headers, 'x-user-id');
  if (headerUserId) {
    return headerUserId;
  }

  const authHeader = readHeader(req.headers, 'authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return (payload.sub || payload.userId) as string;
    } catch {
      return null;
    }
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    return (payload.sub || payload.userId) as string;
  } catch {
    return null;
  }
}
