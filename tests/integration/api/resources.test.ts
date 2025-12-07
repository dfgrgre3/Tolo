import { GET } from '@/app/api/resources/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    resource: {
      findMany: jest.fn(),
    },
  },
}));

describe('Resources API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/resources', () => {
    it('should return list of resources', async () => {
      const mockResources = [
        {
          id: 'resource-1',
          title: 'Mathematics Textbook',
          description: 'Comprehensive math textbook',
          type: 'book',
          url: 'https://example.com/book.pdf',
          createdAt: new Date(),
        },
        {
          id: 'resource-2',
          title: 'Physics Video',
          description: 'Educational physics video',
          type: 'video',
          url: 'https://example.com/video.mp4',
          createdAt: new Date(),
        },
      ];

      (prisma.resource.findMany as jest.Mock).mockResolvedValue(mockResources);

      const request = new NextRequest('http://localhost/api/resources', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should return resources ordered by creation date', async () => {
      (prisma.resource.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/resources', {
        method: 'GET',
      });

      await GET(request);

      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});

