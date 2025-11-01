// اختبار أساسي للتأكد من عمل Jest
import { sum } from '../src/utils/math';

describe('Basic Tests', () => {
  test('1 + 1 = 2', () => {
    expect(sum(1, 1)).toBe(2);
  });
});
