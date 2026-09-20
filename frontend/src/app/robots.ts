import { type MetadataRoute } from 'next';
import { SITE } from '@thanawy/shared/site-config';

export default function robots(): MetadataRoute.Robots {
  // NEXT_PUBLIC_BASE_URL = http://localhost:3000 in dev, production URL in prod
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || SITE.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Advisory layer only — enforcement is X-Robots-Tag in
        // next.config.js. Keep the two lists in sync.
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/billing/',
          '/subscription/',
          '/jobs/',
          '/employer/',
          '/teaching/',
          '/profile/',
          '/learning/',
          '/cart/',
          '/wishlist/',
          '/chat/',
          '/support/tickets/',
          '/courses/*/checkout/',
          '/courses/*/learn/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
