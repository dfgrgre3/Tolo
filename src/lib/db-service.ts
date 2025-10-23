import { prisma, closeDatabaseConnection, checkDatabaseHealth } from './db';
import { CacheService } from './redis';
import { Prisma } from '@prisma/client';

// Type for paginated results
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Execute a database query with proper error handling
 * @param queryFn The database query function to execute
 * @param errorMessage Custom error message to log
 * @returns The result of the query or null if an error occurred
 */
export async function executeQuery<T>(
  queryFn: () => Promise<T>,
  errorMessage: string = 'Database query failed'
): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    // Log specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Prisma error code: ${error.code}`);
      console.error(`Prisma error meta:`, error.meta);
    }
    
    return null;
  }
}

/**
 * Execute a database transaction with proper error handling
 * @param transactionFn The transaction function to execute
 * @param errorMessage Custom error message to log
 * @returns The result of the transaction or null if an error occurred
 */
export async function executeTransaction<T>(
  transactionFn: (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  errorMessage: string = 'Database transaction failed'
): Promise<T | null> {
  try {
    // Use a longer timeout for transactions that might take longer
    return await prisma.$transaction(transactionFn, {
      timeout: 10000, // 10 seconds timeout
      maxWait: 5000,  // 5 seconds max wait time
    });
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    // Log specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Prisma error code: ${error.code}`);
      console.error(`Prisma error meta:`, error.meta);
    }
    
    return null;
  }
}

/**
 * Paginate database query results
 * @param model The Prisma model to query
 * @param params Pagination parameters
 * @returns Paginated results
 */
export async function paginate<T extends keyof typeof prisma>(
  model: T,
  params: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
  }
): Promise<PaginatedResult<Awaited<ReturnType<typeof prisma[T]['findMany']>>[0]>> {
  const { where, orderBy, skip = 0, take = 10 } = params;
  
  // Ensure take is within reasonable limits
  const safeTake = Math.min(take, 100);
  
  const [data, totalCount] = await prisma.$transaction([
    prisma[model].findMany({
      where,
      orderBy,
      skip,
      take: safeTake,
    }),
    prisma[model].count({
      where,
    }),
  ]);
  
  return {
    data,
    totalCount,
    hasNextPage: skip + safeTake < totalCount,
    hasPreviousPage: skip > 0,
  };
}

/**
 * Batch update records with proper error handling
 * @param model The Prisma model to update
 * @param where Where condition for records to update
 * @param data Data to update records with
 * @returns Number of updated records
 */
export async function batchUpdate<T extends keyof typeof prisma>(
  model: T,
  where: any,
  data: any
): Promise<number> {
  try {
    const result = await prisma[model].updateMany({
      where,
      data,
    });
    
    return result.count;
  } catch (error) {
    console.error(`Batch update failed for model ${String(model)}:`, error);
    return 0;
  }
}

/**
 * Batch delete records with proper error handling
 * @param model The Prisma model to delete from
 * @param where Where condition for records to delete
 * @returns Number of deleted records
 */
export async function batchDelete<T extends keyof typeof prisma>(
  model: T,
  where: any
): Promise<number> {
  try {
    const result = await prisma[model].deleteMany({
      where,
    });
    
    return result.count;
  } catch (error) {
    console.error(`Batch delete failed for model ${String(model)}:`, error);
    return 0;
  }
}

/**
 * Find a record or create it if it doesn't exist
 * @param model The Prisma model to query
 * @param where Where condition to find the record
 * @param create Data to create the record with if it doesn't exist
 * @returns The found or created record
 */
export async function findOrCreate<T extends keyof typeof prisma>(
  model: T,
  where: any,
  create: any
): Promise<Awaited<ReturnType<typeof prisma[T]['findUnique']>> | null> {
  try {
    // Try to find the record first
    let record = await prisma[model].findUnique({
      where,
    });
    
    // If not found, create it
    if (!record) {
      record = await prisma[model].create({
        data: { ...where, ...create },
      });
    }
    
    return record;
  } catch (error) {
    console.error(`Find or create failed for model ${String(model)}:`, error);
    return null;
  }
}

/**
 * Get cached data or fetch from database if not in cache
 * @param cacheKey The cache key to use
 * @param fetchFn Function to fetch data from database if not in cache
 * @param ttl Time to live in seconds (default: 5 minutes)
 * @returns Cached or fetched data
 */
export async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  return await CacheService.getOrSet(cacheKey, fetchFn, ttl);
}

/**
 * Invalidate a specific cache key
 * @param key Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  await CacheService.del(key);
}

/**
 * Invalidate cache with a specific pattern
 * @param pattern Pattern to invalidate (e.g., "user:123:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  await CacheService.invalidatePattern(pattern);
}

// Export the prisma instance and utility functions
export { prisma, closeDatabaseConnection, checkDatabaseHealth };
