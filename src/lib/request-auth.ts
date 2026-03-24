import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { TokenService, type TokenPayload } from '@/services/auth/token-service';

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
    const payload = await TokenService.verifyToken<TokenPayload>(token);
    if (payload?.userId) {
      return payload.userId;
    }
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) {
    return null;
  }

  const payload = await TokenService.verifyToken<TokenPayload>(accessToken);
  return payload?.userId ?? null;
}
