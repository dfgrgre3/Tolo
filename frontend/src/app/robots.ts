import { type MetadataRoute } from 'next';
import { SITE } from '@shared/site-config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/settings/',
          '/profile/',
          '/notifications/',
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
