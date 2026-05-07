import { NextRequest } from 'next/server';
import { BACKEND_URL, backendJsonResponse, upstreamAuthHeaders } from '@/app/api/auth/_utils';

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/api/activities/recent${search}`;
  
  console.log(`[API Proxy] GET /api/activities/recent -> ${targetUrl}`);
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: upstreamAuthHeaders(request),
      credentials: 'include',
      cache: 'no-store',
    });
    
    return backendJsonResponse(response);
  } catch (error) {
    console.error('[API Proxy] Error fetching recent activities:', error);
    return Response.json({ error: 'Failed to connect to backend' }, { status: 502 });
  }
}
