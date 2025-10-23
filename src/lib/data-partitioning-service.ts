import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface PartitionInfo {
  tableName: string
  partitionName: string
  startDate: Date
  endDate: Date
  rowCount?: number
}

export interface DataRetentionPolicy {
  tableName: string
  retentionDays: number
  cleanupEnabled: boolean
}

export interface DataSizeThreshold {
  tableName: string
  maxRows: number
  maxSizeInMB: number
  autoExtendMonths: number
}

export class DataPartitioningService {
  private static readonly DATA_SIZE_THRESHOLDS: DataSizeThreshold[] = [
    { tableName: 'StudySession', maxRows: 1000000, maxSizeInMB: 500, autoExtendMonths: 12 }, // 1M rows, 500MB, extend 1 year
    { tableName: 'ProgressSnapshot', maxRows: 500000, maxSizeInMB: 200, autoExtendMonths: 6 },
    { tableName: 'SecurityLog', maxRows: 100000, maxSizeInMB: 100, autoExtendMonths: 6 },
    { tableName: 'Session', maxRows: 50000, maxSizeInMB: 50, autoExtendMonths: 3 }
  ]
  private static readonly RETENTION_POLICIES: DataRetentionPolicy[] = [
    { tableName: 'StudySession', retentionDays: 730, cleanupEnabled: true }, // 2 years
    { tableName: 'ProgressSnapshot', retentionDays: 365, cleanupEnabled: true }, // 1 year
    { tableName: 'SecurityLog', retentionDays: 90, cleanupEnabled: true }, // 3 months
    { tableName: 'Session', retentionDays: 30, cleanupEnabled: true } // 1 month
  ]

  /**
   * Create monthly partitions for a specific date range
   */
  static async createMonthlyPartitions(tableName: string, startDate: Date, endDate: Date): Promise<void> {
    const months: Date[] = []

    let currentDate = new Date(startDate)
    currentDate.setDate(1) // Start of month

    while (currentDate <= endDate) {
      months.push(new Date(currentDate))
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    try {
      for (const month of months) {
        await this.createPartitionForMonth(tableName, month)
      }

      console.log(`Created ${months.length} partitions for ${tableName}`)
    } catch (error) {
      console.error(`Failed to create partitions for ${tableName}:`, error)
      throw error
    }
  }

  /**
   * Create partition for a specific month
   */
  private static async createPartitionForMonth(tableName: string, date: Date): Promise<void> {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const partitionName = `${tableName}_${year}_${month}`

    const startDate = new Date(date)
    startDate.setDate(1) // First day of month

    const endDate = new Date(date)
    endDate.setMonth(endDate.getMonth() + 1) // First day of next month

    try {
      // Use raw SQL to create partition since Prisma doesn't support partitioning directly
      await prisma.$executeRaw`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = ${partitionName}
            AND c.relkind = 'r'
            AND n.nspname = 'public'
          ) THEN
            EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
              ${partitionName}, ${tableName}, ${startDate}, ${endDate});
          END IF;
        END
        $$;
      `
    } catch (error) {
      console.error(`Failed to create partition ${partitionName} for ${tableName}:`, error)
      throw error
    }
  }

  /**
   * Get information about existing partitions for a table
   */
  static async getPartitionInfo(tableName: string): Promise<PartitionInfo[]> {
    try {
      const result = await prisma.$queryRaw<PartitionInfo[]>`
        SELECT
          c.relname as "partitionName",
          pg_get_expr(c.relpartbound, c.oid) as bounds,
          CASE
            WHEN pg_get_expr(c.relpartbound, c.oid) LIKE '%default%' THEN NULL
            ELSE pg_table_size(c.oid)
          END as size_bytes,
          CASE
            WHEN pg_get_expr(c.relpartbound, c.oid) LIKE '%default%' THEN NULL
            ELSE (SELECT count(*) FROM ONLY c)
          END as "rowCount"
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_partitioned_table pt ON c.relpartof = pt.partrelid
        WHERE n.nspname = 'public'
        AND pt.partrelid = (SELECT oid FROM pg_class WHERE relname = ${tableName} AND relnamespace = n.oid)
        ORDER BY c.relname;
      `

      // Parse bounds to extract dates
      const partitions: PartitionInfo[] = result.map(row => {
        let startDate: Date | null = null
        let endDate: Date | null = null

        if (row.bounds && !row.bounds.includes('DEFAULT')) {
          // Parse bounds like "FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00')"
          const match = row.bounds.match(/FOR VALUES FROM \('([^']+)'\) TO \('([^']+)'\)/)
          if (match) {
            startDate = new Date(match[1])
            endDate = new Date(match[2])
          }
        }

        return {
          tableName,
          partitionName: row.partitionName,
          startDate: startDate || new Date('1970-01-01'),
          endDate: endDate || new Date('2100-01-01'),
          rowCount: row.rowCount as number | undefined
        }
      })

      return partitions.filter(p => !p.partitionName.includes('_default'))
    } catch (error) {
      console.error(`Failed to get partition info for ${tableName}:`, error)
      return []
    }
  }

  /**
   * Cleanup old partitions based on retention policies
   */
  static async cleanupOldPartitions(): Promise<{
    deletedPartitions: string[]
    error?: string
  }> {
    const deletedPartitions: string[] = []
    let errorMessage: string | undefined

    try {
      for (const policy of this.RETENTION_POLICIES) {
        if (!policy.cleanupEnabled) continue

        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays)

        // Get old partitions to drop
        const oldPartitions = await prisma.$queryRaw<{ partition_name: string }[]>`
          SELECT c.relname as partition_name
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_partitioned_table pt ON c.relpartof = pt.partrelid
          WHERE n.nspname = 'public'
          AND pt.partrelid = (SELECT oid FROM pg_class WHERE relname = ${policy.tableName} AND relnamespace = n.oid)
          AND c.relname NOT LIKE '%_default'
          AND pg_get_expr(c.relpartbound, c.oid) LIKE '%FROM%'
          AND split_part(split_part(pg_get_expr(c.relpartbound, c.oid), '''', 2), '-', 1)::integer < ${cutoffDate.getFullYear()}
            OR (
              split_part(split_part(pg_get_expr(c.relpartbound, c.oid), '''', 2), '-', 1)::integer = ${cutoffDate.getFullYear()}
              AND split_part(split_part(pg_get_expr(c.relpartbound, c.oid), '''', 2), '-', 2)::integer < ${cutoffDate.getMonth() + 1}
            );
        `

        // Drop old partitions
        for (const partition of oldPartitions) {
          try {
            await prisma.$executeRaw`DROP TABLE IF EXISTS ${policy.tableName}.${partition.partition_name} CASCADE;`
            deletedPartitions.push(`${policy.tableName}.${partition.partition_name}`)
          } catch (dropError) {
            console.error(`Failed to drop partition ${partition.partition_name}:`, dropError)
            errorMessage = errorMessage || `Failed to drop some partitions: ${dropError}`
          }
        }
      }

      // Create archive table for analytical data
      await this.archiveOperationalData()

    } catch (error) {
      console.error('Error during partition cleanup:', error)
      errorMessage = `Partition cleanup failed: ${error}`
    }

    return { deletedPartitions, error: errorMessage }
  }

  /**
   * Archive operational data for analytics (keep aggregated data)
   */
  private static async archiveOperationalData(): Promise<void> {
    try {
      // Archive monthly aggregated study session data
      await prisma.$executeRaw`
        INSERT INTO archive.study_sessions_monthly (
          user_id,
          year,
          month,
          total_minutes,
          session_count,
          average_focus_score,
          last_activity
        )
        SELECT
          "userId",
          EXTRACT(YEAR FROM "createdAt")::integer,
          EXTRACT(MONTH FROM "createdAt")::integer,
          SUM("durationMin"),
          COUNT(*),
          AVG("focusScore"),
          MAX("createdAt")
        FROM "StudySession"
        WHERE "createdAt" < CURRENT_DATE - INTERVAL '1 year'
        AND NOT EXISTS (
          SELECT 1 FROM archive.study_sessions_monthly asm
          WHERE asm.user_id = "StudySession"."userId"
          AND asm.year = EXTRACT(YEAR FROM "StudySession"."createdAt")::integer
          AND asm.month = EXTRACT(MONTH FROM "StudySession"."createdAt")::integer
        )
        GROUP BY "userId", EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
        ON CONFLICT (user_id, year, month) DO NOTHING;
      `
    } catch (error) {
      console.error('Error archiving operational data:', error)
      // Don't throw - archiving failure shouldn't stop cleanup
    }
  }

  /**
   * Monitor partition health and generate maintenance recommendations
   */
  static async getPartitionHealthReport(): Promise<{
    tableHealth: {
      tableName: string
      partitionCount: number
      largestPartition: string
      oldestPartition: string
      newestPartition: string
      recommendedActions: string[]
    }[]
  }> {
    const tableHealth: any[] = []

    for (const policy of this.RETENTION_POLICIES) {
      const partitions = await this.getPartitionInfo(policy.tableName)
      const recommendedActions: string[] = []

      if (partitions.length === 0) {
        recommendedActions.push(`No partitions found - create initial partitions`)
      } else {
        // Check for old partitions that should be cleaned up
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays)

        const oldPartitions = partitions.filter(p => p.endDate < cutoffDate)
        if (oldPartitions.length > 0) {
          recommendedActions.push(`Remove ${oldPartitions.length} partitions older than ${policy.retentionDays} days`)
        }

        // Check for missing recent partitions
        const latestPartition = partitions
          .filter(p => p.endDate < new Date())
          .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]

        if (latestPartition) {
          const oneMonthFromNow = new Date()
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

          if (latestPartition.endDate < oneMonthFromNow) {
            const missingMonths = Math.ceil((oneMonthFromNow.getTime() - latestPartition.endDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
            recommendedActions.push(`Create ${missingMonths} additional future partitions`)
          }
        }
      }

      tableHealth.push({
        tableName: policy.tableName,
        partitionCount: partitions.length,
        largestPartition: partitions.sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0))[0]?.partitionName || 'N/A',
        oldestPartition: partitions.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]?.partitionName || 'N/A',
        newestPartition: partitions.sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]?.partitionName || 'N/A',
        recommendedActions
      })
    }

    return { tableHealth }
  }

  /**
   * Check data size and automatically extend partitions if needed
   */
  static async checkAndExtendPartitionsIfNeeded(): Promise<{
    triggeredActions: string[]
    errors?: string[]
  }> {
    const triggeredActions: string[] = []
    const errors: string[] = []

    try {
      for (const threshold of this.DATA_SIZE_THRESHOLDS) {
        try {
          // Get current table statistics
          const stats = await prisma.$queryRaw<{ row_count: number, size_bytes: number, size_pretty: string }[]>`
            SELECT
              (SELECT count(*) FROM "${threshold.tableName}") as row_count,
              pg_total_relation_size('${threshold.tableName}') as size_bytes,
              pg_size_pretty(pg_total_relation_size('${threshold.tableName}')) as size_pretty
          `

          const { row_count, size_bytes, size_pretty } = stats[0]
          const sizeMB = size_bytes / (1024 * 1024)

          // Check if thresholds are exceeded
          const rowsExceeded = row_count > threshold.maxRows
          const sizeExceeded = sizeMB > threshold.maxSizeInMB

          if (rowsExceeded || sizeExceeded) {
            const reason = rowsExceeded && sizeExceeded
              ? `${row_count} rows (> ${threshold.maxRows}) and ${size_pretty} (> ${threshold.maxSizeInMB}MB)`
              : rowsExceeded
                ? `${row_count} rows (> ${threshold.maxRows})`
                : `${size_pretty} (> ${threshold.maxSizeInMB}MB)`

            console.log(`Table ${threshold.tableName} size large: ${reason}, extending partitions by ${threshold.autoExtendMonths} months`)

            // Get latest partition to extend from
            const partitions = await this.getPartitionInfo(threshold.tableName)
            const lastPartition = partitions.sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]

            if (lastPartition) {
              const endDate = new Date(lastPartition.endDate)
              endDate.setMonth(endDate.getMonth() + threshold.autoExtendMonths)

              await this.createMonthlyPartitions(threshold.tableName, lastPartition.endDate, endDate)
              triggeredActions.push(`Extended ${threshold.tableName} partitions by ${threshold.autoExtendMonths} months due to: ${reason}`)
            } else {
              // No partitions exist, create initial set
              const startDate = new Date()
              startDate.setHours(0, 0, 0, 0)
              const endDate = new Date(startDate)
              endDate.setMonth(endDate.getMonth() + threshold.autoExtendMonths)

              await this.createMonthlyPartitions(threshold.tableName, startDate, endDate)
              triggeredActions.push(`Created initial ${threshold.autoExtendMonths} months of partitions for ${threshold.tableName} due to: ${reason}`)
            }
          }
        } catch (tableError) {
          console.error(`Error checking table ${threshold.tableName}:`, tableError)
          errors.push(`Failed to check ${threshold.tableName}: ${tableError}`)
        }
      }
    } catch (error) {
      console.error('Error in checkAndExtendPartitionsIfNeeded:', error)
      errors.push(`General error: ${error}`)
    }

    return { triggeredActions, errors: errors.length > 0 ? errors : undefined }
  }

  /**
   * Optimize query performance by checking if partitioning is working correctly
   */
  static async verifyPartitioningEfficiency(): Promise<{
    queriesOptimized: number
    partitionsPruned: number
    performanceIssues: string[]
  }> {
    // This would require database-level monitoring, but we can provide recommendations
    const performanceIssues: string[] = []

    try {
      // Check if large tables are partitioned
      const tableSizes = await prisma.$queryRaw<{ table_name: string, table_size: string }[]>`
        SELECT
          schemaname || '.' || tablename as table_name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
        AND t.tablename IN ('StudySession', 'ProgressSnapshot', 'SecurityLog', 'Session')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `

      for (const table of tableSizes) {
        const size = table.table_size
        if (size.includes('GB') || (size.includes('MB') && parseFloat(size) > 500)) {
          performanceIssues.push(`${table.table_name} is large (${size}) - ensure proper partitioning`)
        }
      }

      // Check partition distribution
      const partitionsWithData = await prisma.$queryRaw<{ count: number }[]>`
        SELECT count(*) as count
        FROM (
          SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_partitioned_table pt ON c.relpartof = pt.partrelid
          WHERE n.nspname = 'public'
          AND (SELECT count(*) FROM ONLY c) > 0
        ) t;
      `

      const partitionsPruned = partitionsWithData[0]?.count || 0

    } catch (error) {
      performanceIssues.push(`Failed to analyze partitioning efficiency: ${error}`)
    }

    return {
      queriesOptimized: 0, // Would need EXPLAIN ANALYZE to determine
      partitionsPruned: 0, // Would need query analysis
      performanceIssues
    }
  }
}

export default DataPartitioningService
