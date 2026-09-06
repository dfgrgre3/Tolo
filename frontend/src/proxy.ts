import type { NextRequest } from 'next/server';
import { runProxyPipeline } from './proxy-pipeline';

export async function proxy(request: NextRequest) {
  return runProxyPipeline(request);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
