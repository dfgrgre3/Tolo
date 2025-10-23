import { NextRequest, NextResponse } from 'next/server'
import DataPartitioningService from '@/lib/data-partitioning-service'
import { auth } from '@/lib/auth'
import { 
  createErrorResponse, 
  createSuccessResponse 
} from '@/lib/api-utils'

// Authentication middleware for admin-only access
async function authenticateAdmin(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const session = await auth()
    // Check if user is authenticated and has admin role
    if (session?.user?.id && session?.user?.role === 'admin') {
      return { authorized: true, userId: session.user.id };
    }
    return { authorized: false };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authorized: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    const authResult = await authenticateAdmin(request);
    if (!authResult.authorized) {
      return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
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
        return createErrorResponse(
          'Invalid action. Use: health, info, efficiency, or check_size', 
          400, 
          undefined, 
          'INVALID_ACTION'
        )
    }
  } catch (error) {
    console.error('Database partitions API error:', error)
    return createErrorResponse(
      'Internal server error', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'INTERNAL_ERROR'
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const authResult = await authenticateAdmin(request);
    if (!authResult.authorized) {
      return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED');
    }

    const body = await request.json()
    const { action, tableName, startDate, endDate } = body

    switch (action) {
      case 'create_partitions':
        if (!tableName || !startDate || !endDate) {
          return createErrorResponse(
            'tableName, startDate, and endDate are required', 
            400, 
            undefined, 
            'MISSING_PARAMETERS'
          )
        }
        
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return createErrorResponse(
            'Invalid date format. Use ISO format (YYYY-MM-DD)', 
            400, 
            undefined, 
            'INVALID_DATE_FORMAT'
          )
        }
        
        return await createPartitions(tableName, start, end)

      case 'cleanup':
        return await cleanupPartitions()

      case 'maintain':
        return await maintainPartitions()

      default:
        return createErrorResponse(
          'Invalid action. Use: create_partitions, cleanup, or maintain', 
          400, 
          undefined, 
          'INVALID_ACTION'
        )
    }
  } catch (error) {
    console.error('Database partitions POST API error:', error)
    return createErrorResponse(
      'Internal server error', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'INTERNAL_ERROR'
    )
  }
}

async function getPartitionHealth() {
  try {
    const report = await DataPartitioningService.getPartitionHealthReport()
    return createSuccessResponse(report)
  } catch (error) {
    console.error('Error getting partition health:', error)
    return createErrorResponse(
      'Failed to get partition health report', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'HEALTH_REPORT_ERROR'
    )
  }
}

async function getPartitionInfo() {
  try {
    const tables = ['StudySession', 'ProgressSnapshot', 'SecurityLog', 'Session']
    const info: Record<string, any> = {}

    for (const tableName of tables) {
      try {
        info[tableName] = await DataPartitioningService.getPartitionInfo(tableName)
      } catch (tableError) {
        console.error(`Error getting partition info for ${tableName}:`, tableError)
        info[tableName] = { error: 'Failed to fetch partition info' }
      }
    }

    return createSuccessResponse({ partitionInfo: info })
  } catch (error) {
    console.error('Error getting partition info:', error)
    return createErrorResponse(
      'Failed to get partition information', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'PARTITION_INFO_ERROR'
    )
  }
}

async function getPartitioningEfficiency() {
  try {
    const report = await DataPartitioningService.getPartitioningEfficiencyReport()
    return createSuccessResponse(report)
  } catch (error) {
    console.error('Error getting partitioning efficiency:', error)
    return createErrorResponse(
      'Failed to get partitioning efficiency report', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'EFFICIENCY_REPORT_ERROR'
    )
  }
}

async function checkAndExtendPartitions() {
  try {
    const result = await DataPartitioningService.checkAndExtendPartitions()
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Error checking and extending partitions:', error)
    return createErrorResponse(
      'Failed to check and extend partitions', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'CHECK_EXTEND_ERROR'
    )
  }
}

async function createPartitions(tableName: string, startDate: Date, endDate: Date) {
  try {
    const result = await DataPartitioningService.createPartitions(tableName, startDate, endDate)
    return createSuccessResponse(result)
  } catch (error) {
    console.error(`Error creating partitions for ${tableName}:`, error)
    return createErrorResponse(
      `Failed to create partitions for ${tableName}`, 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'CREATE_PARTITIONS_ERROR'
    )
  }
}

async function cleanupPartitions() {
  try {
    const result = await DataPartitioningService.cleanupOldPartitions()
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Error cleaning up partitions:', error)
    return createErrorResponse(
      'Failed to clean up old partitions', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'CLEANUP_ERROR'
    )
  }
}

async function maintainPartitions() {
  try {
    const result = await DataPartitioningService.maintainPartitions()
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Error maintaining partitions:', error)
    return createErrorResponse(
      'Failed to maintain partitions', 
      500, 
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      'MAINTAIN_ERROR'
    )
  }
}