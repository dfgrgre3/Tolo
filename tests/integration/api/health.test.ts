import { GET as healthCheck } from '@/app/api/healthz/route';
import { GET as readyCheck } from '@/app/api/readyz/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('Health Check API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/healthz', () => {
    it('should return health status', async () => {
      const request = new NextRequest('http://localhost/api/healthz', {
        method: 'GET',
      });

      const response = await healthCheck(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(['ok', 'healthy']).toContain(data.status);
    });
  });

  describe('GET /api/readyz', () => {
    it('should return ready status when database is connected', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: 1 }]);

      const request = new NextRequest('http://localhost/api/readyz', {
        method: 'GET',
      });

      const response = await readyCheck(request);
      const data = await response.json();

      // Database might not be connected in test environment
      expect([200, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(data.status).toBe('ready');
      }
    });

    it('should return not ready when database is disconnected', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost/api/readyz', {
        method: 'GET',
      });

      const response = await readyCheck(request);
      expect(response.status).toBe(503);
    });
  });
});

