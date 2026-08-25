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
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/billing/',
          '/subscription/',
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
