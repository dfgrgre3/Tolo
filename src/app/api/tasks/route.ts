import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { withAuthCache } from '@/lib/cache-middleware';
import { invalidateUserCache } from '@/lib/cache-invalidation-service';
import { getOrSetEnhanced } from '@/lib/cache-service-enhanced';
import { gamificationService } from '@/lib/gamification-service';
import { firestoreService } from '@/lib/firestore-service';
import { rateLimit, handleApiError, badRequestResponse, unauthorizedResponse, successResponse } from '@/lib/api-utils';

// Validation schemas
const TaskCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  subjectId: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

const TaskUpdateSchema = z.object({
  id: z.string().min(1, "Task ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
  description: z.string().max(1000, "Description is too long").optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  subjectId: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

// Rate limiting configuration
const GET_RATE_LIMIT = 100; // 100 requests per window
const MUTATION_RATE_LIMIT = 50; // 50 requests per window

// Handle GET requests - fetch tasks
export async function GET(request: NextRequest) {
  return withAuthCache(request, handleGetRequest, 'tasks', 300); // Cache for 5 minutes
}

async function handleGetRequest(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(req, GET_RATE_LIMIT, 'get_tasks');
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication using the unified AuthService
    const verification = await authService.verifyTokenFromRequest(req);
    const decodedToken = verification.isValid && verification.user ? { userId: verification.user.id } : null;
    if (!decodedToken) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const completed = searchParams.get('completed');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const subjectId = searchParams.get('subjectId');

    // Validate query parameters
    if (isNaN(limit) || limit > 100 || limit < 1) {
      return badRequestResponse('Invalid limit parameter. Must be between 1 and 100.', 'INVALID_PARAMETER');
    }

    if (isNaN(offset) || offset < 0) {
      return badRequestResponse('Invalid offset parameter. Must be a non-negative integer.', 'INVALID_PARAMETER');
    }

    // Build where clause
    const where: any = {
      userId: decodedToken.userId,
    };

    if (completed !== null) {
      const isCompleted = completed === 'true';
      where.completed = isCompleted;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    // Fetch tasks from database
    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Return successful response
    return successResponse(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}

// Handle POST requests - create task
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, MUTATION_RATE_LIMIT, 'create_task');
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication using the unified AuthService
    const verification = await authService.verifyTokenFromRequest(request);
    const decodedToken = verification.isValid && verification.user ? { userId: verification.user.id } : null;
    if (!decodedToken) {
      return unauthorizedResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const parsedBody = TaskCreateSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequestResponse(`Invalid request body: ${parsedBody.error.message}`, 'VALIDATION_ERROR');
    }

    const { title, description, dueDate, priority, subjectId, status } = parsedBody.data;

    // Create task in database
    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        userId: decodedToken.userId,
        subjectId,
      },
    });

    // Invalidate cache
    await invalidateUserCache(decodedToken.userId);

    // Trigger gamification
    await gamificationService.updateUserProgress(decodedToken.userId, 'task_created');

    // Return successful response
    return successResponse(task, 'Task created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// Handle PUT requests - update task
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, MUTATION_RATE_LIMIT, 'update_task');
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication using the unified AuthService
    const verification = await authService.verifyTokenFromRequest(request);
    const decodedToken = verification.isValid && verification.user ? { userId: verification.user.id } : null;
    if (!decodedToken) {
      return unauthorizedResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const parsedBody = TaskUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return badRequestResponse(`Invalid request body: ${parsedBody.error.message}`, 'VALIDATION_ERROR');
    }

    const { id, title, description, dueDate, priority, subjectId, status } = parsedBody.data;

    // Check if task belongs to user
    const existingTask = await prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!existingTask) {
      return badRequestResponse('Task not found', 'TASK_NOT_FOUND');
    }

    if (existingTask.userId !== decodedToken.userId) {
      return unauthorizedResponse('You do not have permission to update this task');
    }

    // Update task in database
    const task = await prisma.task.update({
      where: {
        id,
      },
      data: {
        title,
        description,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        priority: priority || undefined,
        status: status || undefined,
        subjectId: subjectId !== undefined ? subjectId : undefined,
      },
    });

    // Invalidate cache
    await invalidateUserCache(decodedToken.userId);

    // Trigger gamification for completion
    if (task.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      await gamificationService.updateUserProgress(decodedToken.userId, 'task_completed');
    }

    // Return successful response
    return successResponse(task, 'Task updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// Handle DELETE requests - delete task
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, MUTATION_RATE_LIMIT, 'delete_task');
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication using the unified AuthService
    const verification = await authService.verifyTokenFromRequest(request);
    const decodedToken = verification.isValid && verification.user ? { userId: verification.user.id } : null;
    if (!decodedToken) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return badRequestResponse('Task ID is required', 'MISSING_TASK_ID');
    }

    // Check if task belongs to user
    const existingTask = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!existingTask) {
      return badRequestResponse('Task not found', 'TASK_NOT_FOUND');
    }

    if (existingTask.userId !== decodedToken.userId) {
      return unauthorizedResponse('You do not have permission to delete this task');
    }

    // Delete task from database
    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    // Invalidate cache
    await invalidateUserCache(decodedToken.userId);

    // Return successful response
    return successResponse(null, 'Task deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
