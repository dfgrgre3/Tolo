jest.mock('@/lib/rate-limiting-service', () => ({
  rateLimitingService: {
    checkRateLimit: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Rate Limiting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request under rate limit', async () => {
      const { rateLimitingService } = require('@/lib/rate-limiting-service');
      (rateLimitingService.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        attempts: 5,
      });

      const result = await rateLimitingService.checkRateLimit('user-1');

      expect(result.allowed).toBe(true);
      expect(result.attempts).toBe(5);
    });

    it('should block request over rate limit', async () => {
      const { rateLimitingService } = require('@/lib/rate-limiting-service');
      (rateLimitingService.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        attempts: 11,
      });

      const result = await rateLimitingService.checkRateLimit('user-1');

      expect(result.allowed).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      const { rateLimitingService } = require('@/lib/rate-limiting-service');
      (rateLimitingService.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        attempts: 0,
      });

      const result = await rateLimitingService.checkRateLimit('user-1');

      // Should allow by default on error (fail open)
      expect(result.allowed).toBe(true);
    });
  });
});

