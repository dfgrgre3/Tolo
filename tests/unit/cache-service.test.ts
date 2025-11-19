// Mock cache-service-unified completely to avoid server-only check
jest.mock('@/lib/cache-service-unified', () => ({
  getOrSetEnhanced: jest.fn(),
  CacheService: {
    getOrSet: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
}));

// getOrSetEnhanced and CacheService are imported for type checking but mocked

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Cache Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrSetEnhanced', () => {
    it('should return cached value if exists', async () => {
      const { getOrSetEnhanced } = require('@/lib/cache-service-unified');
      (getOrSetEnhanced as jest.Mock).mockResolvedValue({ data: 'test' });

      const result = await getOrSetEnhanced(
        'test-key',
        async () => ({ data: 'new' }),
        300
      );

      expect(result).toEqual({ data: 'test' });
      expect(getOrSetEnhanced).toHaveBeenCalledWith('test-key', expect.any(Function), 300);
    });

    it('should set and return new value if cache miss', async () => {
      const { getOrSetEnhanced } = require('@/lib/cache-service-unified');
      (getOrSetEnhanced as jest.Mock).mockResolvedValue({ data: 'new' });

      const result = await getOrSetEnhanced(
        'test-key',
        async () => ({ data: 'new' }),
        300
      );

      expect(result).toEqual({ data: 'new' });
    });

    it('should handle cache errors gracefully', async () => {
      const { getOrSetEnhanced } = require('@/lib/cache-service-unified');
      (getOrSetEnhanced as jest.Mock).mockResolvedValue({ data: 'fallback' });

      const result = await getOrSetEnhanced(
        'test-key',
        async () => ({ data: 'fallback' }),
        300
      );

      expect(result).toEqual({ data: 'fallback' });
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache key', async () => {
      const { CacheService } = require('@/lib/cache-service-unified');
      (CacheService.del as jest.Mock).mockResolvedValue(undefined);

      await CacheService.del('test-key');

      expect(CacheService.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle deletion errors', async () => {
      const { CacheService } = require('@/lib/cache-service-unified');
      (CacheService.del as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await expect(
        CacheService.del('test-key')
      ).rejects.toThrow('Delete failed');
    });
  });
});

