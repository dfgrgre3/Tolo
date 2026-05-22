import { type MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tolo.app';

  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 1.0 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/forgot-password`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/courses`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/teachers`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/announcements`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/library`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/resources`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/contests`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/certificates`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/tips`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
  ];

  return staticRoutes;
}
