import { EducationalCache, CacheService } from '../src/lib/cache';

async function main() {
  try {
    // Invalidate both prefixes just to be sure
    await CacheService.invalidatePattern('educational:courses:list:*');
    await CacheService.invalidatePattern('api_v1:courses:public*');
    console.log('---CACHE_INVALIDATED---');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
