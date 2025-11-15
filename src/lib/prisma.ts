// Lazy load db-unified to prevent server-only bundling issues
// This file is kept for backward compatibility
// New implementations should use the db-unified.ts service which has better connection management

// Lazy load prisma instance to prevent client bundling
let prismaInstance: any = null;

async function getPrismaInstance() {
  if (!prismaInstance) {
    // Runtime check to ensure this only runs on the server
    if (typeof window !== 'undefined') {
      throw new Error('Prisma can only be used on the server');
    }
    // Use dynamic import to prevent static analysis from bundling server-only code
    // Use string concatenation to prevent webpack from statically analyzing the import
    const dbUnifiedModule = await import('./' + 'db-unified');
    prismaInstance = dbUnifiedModule.enhancedPrisma;
  }
  return prismaInstance;
}

// Export a getter function for safe usage
export async function getPrisma() {
  return getPrismaInstance();
}

// For backward compatibility, we need to export prisma
// However, direct access will throw an error to prevent client-side usage
// Server-side code should use getPrisma() function for async access
export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    // Runtime check - this should never be called on the client
    if (typeof window !== 'undefined') {
      throw new Error(
        'Prisma can only be used on the server. ' +
        'If you are using this in a server component, use: const prisma = await getPrisma(); ' +
        'instead of importing prisma directly.'
      );
    }
    
    // This should not be reached, but throw error to prevent misuse
    throw new Error(
      'Direct prisma access is not supported in this version. ' +
      'Use getPrisma() function for async access: const prisma = await getPrisma();'
    );
  }
}) as any;