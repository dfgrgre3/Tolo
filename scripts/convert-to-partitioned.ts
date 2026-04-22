import { prisma } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function migrateTableToPartitioned(tableName: string, partitionKey: string) {
    logger.info(`Starting migration for ${tableName}...`);

    try {
        // 1. Rename existing table and its primary key constraint
        const oldTableName = `${tableName}_old_${Date.now()}`;
        const oldPkeyName = `${tableName}_pkey_old_${Date.now()}`;
        
        await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" RENAME TO "${oldTableName}"`);
        // Rename the old constraint if it exists to avoid collision
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "${oldTableName}" RENAME CONSTRAINT "${tableName}_pkey" TO "${oldPkeyName}"`);
        } catch (e) {
            logger.warn(`Could not rename constraint ${tableName}_pkey (it might not exist or have a different name)`);
        }
        
        logger.info(`Renamed ${tableName} to ${oldTableName} and its PKEY to ${oldPkeyName}`);

        // 2. Create new partitioned table (Schema must match exactly)
        // Note: For 1M users, we use Declarative Partitioning
        // This is a simplified example - in production, you'd extract columns dynamically
        if (tableName === 'StudySession') {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE "${tableName}" (
                    "id" TEXT NOT NULL,
                    "userId" TEXT NOT NULL,
                    "subjectId" TEXT,
                    "taskId" TEXT,
                    "startTime" TIMESTAMP(3) NOT NULL,
                    "endTime" TIMESTAMP(3) NOT NULL,
                    "durationMin" INTEGER NOT NULL,
                    "focusScore" INTEGER NOT NULL DEFAULT 0,
                    "notes" TEXT,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL,
                    "strategy" TEXT,

                    CONSTRAINT "${tableName}_pkey" PRIMARY KEY ("id", "${partitionKey}")
                ) PARTITION BY RANGE ("${partitionKey}");
            `);
        }

        // 3. Create initial partitions (Current month + Next 3 months)
        const now = new Date();
        for (let i = 0; i < 4; i++) {
            const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
            
            const suffix = `${start.getFullYear()}_m${(start.getMonth() + 1).toString().padStart(2, '0')}`;
            const partitionName = `"${tableName}_${suffix}"`;

            await prisma.$executeRawUnsafe(`
                CREATE TABLE ${partitionName} 
                PARTITION OF "${tableName}" 
                FOR VALUES FROM ('${start.toISOString().split('T')[0]}') TO ('${end.toISOString().split('T')[0]}');
            `);
            logger.info(`Created partition ${partitionName}`);
        }

        // 4. Migrate data from old table to new partitioned table
        logger.info(`Migrating data from ${oldTableName} to ${tableName}...`);
        await prisma.$executeRawUnsafe(`
            INSERT INTO "${tableName}" 
            SELECT * FROM "${oldTableName}"
        `);
        
        logger.info(`Migration successful for ${tableName}. You can drop ${oldTableName} after verification.`);
    } catch (error) {
        logger.error(`Failed to migrate ${tableName}:`, error);
        throw error;
    }
}

async function main() {
    // Start with the heaviest table
    await migrateTableToPartitioned('StudySession', 'startTime');
}

main().catch(console.error);
