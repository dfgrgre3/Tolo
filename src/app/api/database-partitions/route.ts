import { NextRequest, NextResponse } from 'next/server'
import DataPartitioningService from '@/lib/data-partitioning-service'
// Removed next-auth import - using custom auth system

// Authentication middleware for admin-only access
// Note: Using custom auth system - auth() returns null, need to implement proper auth check
async function authenticateAdmin(request: NextRequest): Promise<boolean> {
  try {
    // TODO: Implement proper authentication using custom auth system
    // For now, using token from cookies or headers
    const token = request.cookies.get('authToken')?.value || request.headers.get('authorization')?.replace('Bearer ', '');
    // TODO: Verify token and check admin role
    return !!token; // Temporary: allow if token exists
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    if (!(await authenticateAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health':
        return await getPartitionHealth()
      case 'info':
        return await getPartitionInfo()
      case 'efficiency':
        return await getPartitioningEfficiency()
      case 'check_size':
        return await checkAndExtendPartitions()
      default:
        return NextResponse.json({
          error: 'Invalid action. Use: health, info, efficiency, or check_size'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Database partitions API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    if (!(await authenticateAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, tableName, startDate, endDate } = body

    switch (action) {
      case 'create_partitions':
        if (!tableName || !startDate || !endDate) {
          return NextResponse.json({
            error: 'tableName, startDate, and endDate are required'
          }, { status: 400 })
        }
        return await createPartitions(tableName, new Date(startDate), new Date(endDate))

      case 'cleanup':
        return await cleanupPartitions()

      case 'maintain':
        return await maintainPartitions()

      default:
        return NextResponse.json({
          error: 'Invalid action. Use: create_partitions, cleanup, or maintain'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Database partitions POST API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function getPartitionHealth() {
  const report = await DataPartitioningService.getPartitionHealthReport()
  return NextResponse.json(report)
}

async function getPartitionInfo() {
  const tables = ['StudySession', 'ProgressSnapshot', 'SecurityLog', 'Session']
  const info: Record<string, any> = {}

  for (const tableName of tables) {
    info[tableName] = await DataPartitioningService.getPartitionInfo(tableName)
  }

  return NextResponse.json({ partitionInfo: info })
}

async function getPartitioningEfficiency() {
  const efficiency = await DataPartitioningService.verifyPartitioningEfficiency()
  return NextResponse.json(efficiency)
}

async function checkAndExtendPartitions() {
  try {
    const result = await DataPartitioningService.checkAndExtendPartitionsIfNeeded()
    return NextResponse.json({
      success: true,
      triggeredActions: result.triggeredActions,
      ...(result.errors && { errors: result.errors })
    })
  } catch (error) {
    console.error('Failed to check and extend partitions:', error)
    return NextResponse.json({
      error: `Failed to check and extend partitions: ${error}`
    }, { status: 500 })
  }
}

async function createPartitions(tableName: string, startDate: Date, endDate: Date) {
  try {
    await DataPartitioningService.createMonthlyPartitions(tableName, startDate, endDate)
    return NextResponse.json({
      success: true,
      message: `Partitions created successfully for ${tableName}`
    })
  } catch (error) {
    console.error('Failed to create partitions:', error)
    return NextResponse.json({
      error: `Failed to create partitions: ${error}`
    }, { status: 500 })
  }
}

async function cleanupPartitions() {
  try {
    const result = await DataPartitioningService.cleanupOldPartitions()
    return NextResponse.json({
      success: true,
      deletedPartitions: result.deletedPartitions,
      ...(result.error && { warnings: [result.error] })
    })
  } catch (error) {
    console.error('Failed to cleanup partitions:', error)
    return NextResponse.json({
      error: `Failed to cleanup partitions: ${error}`
    }, { status: 500 })
  }
}

async function maintainPartitions() {
  try {
    // Get health report to identify what maintenance is needed
    const health = await DataPartitioningService.getPartitionHealthReport()
    const actionsPerformed: string[] = []

    for (const table of health.tableHealth) {
      // Check if partitions need to be created
      if (table.recommendedActions.some(action => action.includes('Create'))) {
        const oneMonthFromNow = new Date()
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

        const sixMonthsFromNow = new Date()
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

        await DataPartitioningService.createMonthlyPartitions(table.tableName, oneMonthFromNow, sixMonthsFromNow)
        actionsPerformed.push(`Created future partitions for ${table.tableName}`)
      }

      // Check if cleanup is needed
      if (table.recommendedActions.some(action => action.includes('Remove'))) {
        const cleanupResult = await DataPartitioningService.cleanupOldPartitions()
        if (cleanupResult.deletedPartitions.length > 0) {
          const deletedForTable = cleanupResult.deletedPartitions.filter((dp: string) => dp.startsWith(table.tableName))
          if (deletedForTable.length > 0) {
            actionsPerformed.push(`Cleaned up ${deletedForTable.length} old partitions for ${table.tableName}`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      actionsPerformed,
      healthReport: health
    })
  } catch (error) {
    console.error('Failed to perform partition maintenance:', error)
    return NextResponse.json({
      error: `Failed to perform partition maintenance: ${error}`
    }, { status: 500 })
  }
}
