import { sum } from '@/utils/math';

describe('Utils - Math', () => {
  describe('sum', () => {
    it('should add two positive numbers correctly', () => {
      expect(sum(1, 1)).toBe(2);
      expect(sum(5, 3)).toBe(8);
      expect(sum(100, 200)).toBe(300);
    });

    it('should handle negative numbers', () => {
      expect(sum(-1, 1)).toBe(0);
      expect(sum(-5, -3)).toBe(-8);
      expect(sum(10, -3)).toBe(7);
    });

    it('should handle zero', () => {
      expect(sum(0, 0)).toBe(0);
      expect(sum(5, 0)).toBe(5);
      expect(sum(0, 10)).toBe(10);
    });

    it('should handle decimal numbers', () => {
      expect(sum(1.5, 2.5)).toBe(4);
      expect(sum(0.1, 0.2)).toBeCloseTo(0.3);
      expect(sum(-1.5, 1.5)).toBe(0);
    });
  });
});

