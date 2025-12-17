// prisma.config.ts
import 'dotenv/config'

// Prisma configuration object for migrations and schema management
const prismaConfig = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use DIRECT_DATABASE_URL for migrations (bypasses connection pooling)
    // This is equivalent to the old directUrl in schema.prisma
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db',
  },
}

export default prismaConfig