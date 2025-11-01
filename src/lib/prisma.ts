// Import directly from db-unified to avoid circular dependencies
import { enhancedPrisma } from './db-unified';

// Export enhancedPrisma as prisma for backward compatibility
// This ensures consistent connection management and better performance
export const prisma = enhancedPrisma;

// This file is kept for backward compatibility
// New implementations should use the db-unified.ts service which has better connection management