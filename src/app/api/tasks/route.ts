import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { withAuthCache } from '@/lib/cache-middleware';
import { invalidateUserCache } from '@/lib/cache-invalidation-service';
import { getOrSetEnhanced } from '@/lib/cache-service-unified';
import { gamificationService } from '@/lib/services/gamification-service';
import { firestoreService } from '@/lib/services/firestore-service';
import { rateLimit, handleApiError, badRequestResponse, unauthorizedResponse, successResponse } from '@/lib/api-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { TASK_STATUS, TASK_STATUS_VALUES, TASK_PRIORITY, TASK_PRIORITY_VALUES, TASK_PRIORITY_MAP, TASK_DEFAULTS, type TaskStatus, type TaskPriority } from '@/lib/constants';

// Validation schemas
const TaskCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum([TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH] as [string, ...string[]]).optional(),
  subjectId: z.string().optional().nullable(),
  status: z.enum([TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED] as [string, ...string[]]).optional(),
});

const TaskUpdateSchema = z.object({
  id: z.string().min(1, "Task ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
  description: z.string().max(1000, "Description is too long").optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum([TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH] as [string, ...string[]]).optional(),
  subjectId: z.string().optional().nullable(),
  status: z.enum([TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED] as [string, ...string[]]).optional(),
});

// Rate limiting configuration
const GET_RATE_LIMIT = 100; // 100 requests per window
const MUTATION_RATE_LIMIT = 50; // 50 requests per window

// Handle GET requests - fetch tasks
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuthCache(req, handleGetRequest, 'tasks', 300); // Cache for 5 minutes
  });
}

async function handleGetRequest(req: NextRequest) {
  try {
    // Apply rate limiting with timeout protection
    const rateLimitPromise = rateLimit(req, GET_RATE_LIMIT, 'get_tasks');
    const timeoutPromise = new Promise<NextResponse | null>((resolve) => {
      setTimeout(() => resolve(null), 2000); // 2 second timeout
    });

    const rateLimitResult = await Promise.race([rateLimitPromise, timeoutPromise]);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication using the unified AuthService with timeout protection
    const verifyPromise = authService.verifyTokenFromRequest(req);
    const verifyTimeoutPromise = new Promise<{ isValid: false }>((resolve) => {
      setTimeout(() => resolve({ isValid: false }), 5000); // 5 second timeout
    });

    const verification = await Promise.race([verifyPromise, verifyTimeoutPromise]);
    const decodedToken = verification.isValid && verification.user ? { userId: verification.user.userId } : null;
    if (!decodedToken) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit') || '20';
    const completed = searchParams.get('completed');
    const offsetParam = searchParams.get('offset') || '0';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const subjectId = searchParams.get('subjectId');

    // Validate and parse query parameters with better error handling
    const limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit > 100 || limit < 1) {
      return badRequestResponse('Invalid limit parameter. Must be between 1 and 100.', 'INVALID_PARAMETER');
    }

    const offset = parseInt(offsetParam, 10);
    if (isNaN(offset) || offset < 0) {
      return badRequestResponse('Invalid offset parameter. Must be a non-negative integer.', 'INVALID_PARAMETER');
    }

    // Validate status if provided
    if (status && !TASK_STATUS_VALUES.includes(status as TaskStatus)) {
      return badRequestResponse(`Invalid status parameter. Must be ${TASK_STATUS_VALUES.join(', ')}.`, 'INVALID_PARAMETER');
    }

    // Validate priority if provided
    if (priority && !TASK_PRIORITY_VALUES.includes(priority as TaskPriority)) {
      return badRequestResponse(`Invalid priority parameter. Must be ${TASK_PRIORITY_VALUES.join(', ')}.`, 'INVALID_PARAMETER');
    }

    // Build where clause with proper typing using Prisma types
    const where: {
      userId: string;
      completedAt?: { not: null } | null;
      status?: string;
      priority?: number;
      subject?: string;
    } = {
      userId: decodedToken.userId,
    };

    if (completed !== null) {
      const isCompleted = completed === 'true';
      where.completedAt = isCompleted ? { not: null } : null;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      // Convert string priority to number using constants
      where.priority = TASK_PRIORITY_MAP[priority as TaskPriority] || TASK_DEFAULTS.PRIORITY_NUMBER;
    }

    if (subjectId) {
      where.subject = subjectId;
    }

    // Fetch tasks from database with timeout protection
    const fetchPromise = prisma.task.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const dbFetchTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
    });

    const tasks = await Promise.race([fetchPromise, dbFetchTimeoutPromise]);

    // Return successful response
    return successResponse(tasks);
  } catch (error) {
    return handleApiError(error);
  }
}

// Handle POST requests - create task
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit(req, MUTATION_RATE_LIMIT, 'create_task');
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Verify authentication using the unified AuthService
      const verification = await authService.verifyTokenFromRequest(req);
      const decodedToken = verification.isValid && verification.user ? { userId: verification.user.userId } : null;
      if (!decodedToken) {
        return unauthorizedResponse();
      }

      // Parse and validate request body with timeout protection
      let body;
      try {
        const bodyPromise = req.json();
        const bodyTimeoutPromise = new Promise<never>((resolve, reject) => {
          setTimeout(() => reject(new Error('Request body parsing timeout')), 5000);
        });
        body = await Promise.race([bodyPromise, bodyTimeoutPromise]);
      } catch (parseError) {
        return badRequestResponse('Invalid request body format', 'PARSE_ERROR');
      }

      const parsedBody = TaskCreateSchema.safeParse(body);

      if (!parsedBody.success) {
        const errorMessage = parsedBody.error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return badRequestResponse(`Invalid request body: ${errorMessage}`, 'VALIDATION_ERROR');
      }

      const { title, description, dueDate, priority, subjectId, status } = parsedBody.data;

      // Validate dueDate if provided
      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return badRequestResponse('Invalid dueDate format. Must be a valid ISO 8601 datetime string.', 'INVALID_DATE');
        }
        if (dueDateObj < new Date()) {
          return badRequestResponse('Due date cannot be in the past', 'INVALID_DATE');
        }
      }

      // Convert priority string to number using constants
      const priorityNumber = priority
        ? TASK_PRIORITY_MAP[priority as TaskPriority] || TASK_DEFAULTS.PRIORITY_NUMBER
        : TASK_DEFAULTS.PRIORITY_NUMBER;

      // Create task in database with timeout protection
      const createPromise = prisma.task.create({
        data: {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title.trim(),
          description: description?.trim() || null,
          dueAt: dueDate ? new Date(dueDate) : null,
          priority: priorityNumber,
          status: status || TASK_DEFAULTS.STATUS,
          userId: decodedToken.userId,
          subject: subjectId || null,
        },
      });

      const createTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 10000);
      });

      const task = await Promise.race([createPromise, createTimeoutPromise]);

      // Invalidate cache and trigger gamification in parallel (non-blocking)
      Promise.allSettled([
        invalidateUserCache(decodedToken.userId),
        gamificationService.updateUserProgress(decodedToken.userId, 'task_created'),
      ]).catch((error) => {
        // Log but don't block response - use console in case logger is not available
        if (process.env.NODE_ENV === 'development') {
          console.warn('Cache invalidation or gamification update failed:', error);
        }
      });

      // Return successful response
      return successResponse(task, 'Task created successfully', 201);
    } catch (error) {
      return handleApiError(error);
    }
  });
}

// Handle PUT requests - update task
export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit(req, MUTATION_RATE_LIMIT, 'update_task');
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Verify authentication using the unified AuthService
      const verification = await authService.verifyTokenFromRequest(req);
      const decodedToken = verification.isValid && verification.user ? { userId: verification.user.userId } : null;
      if (!decodedToken) {
        return unauthorizedResponse();
      }

      // Parse and validate request body with timeout protection
      let body;
      try {
        const bodyPromise = req.json();
        const bodyTimeoutPromise = new Promise<never>((resolve, reject) => {
          setTimeout(() => reject(new Error('Request body parsing timeout')), 5000);
        });
        body = await Promise.race([bodyPromise, bodyTimeoutPromise]);
      } catch (parseError) {
        return badRequestResponse('Invalid request body format', 'PARSE_ERROR');
      }

      const parsedBody = TaskUpdateSchema.safeParse(body);

      if (!parsedBody.success) {
        const errorMessage = parsedBody.error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return badRequestResponse(`Invalid request body: ${errorMessage}`, 'VALIDATION_ERROR');
      }

      const { id, title, description, dueDate, priority, subjectId, status } = parsedBody.data;

      // Validate task ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return badRequestResponse('Task ID is required and must be a non-empty string', 'INVALID_TASK_ID');
      }

      // Check if task belongs to user with timeout protection
      const findPromise = prisma.task.findUnique({
        where: {
          id: id.trim(),
        },
      });

      const findTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const existingTask = await Promise.race([findPromise, findTimeoutPromise]);

      if (!existingTask) {
        return badRequestResponse('Task not found', 'TASK_NOT_FOUND');
      }

      if (existingTask.userId !== decodedToken.userId) {
        return unauthorizedResponse('You do not have permission to update this task');
      }

      // Validate dueDate if provided
      if (dueDate !== undefined && dueDate !== null) {
        const dueDateObj = new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return badRequestResponse('Invalid dueDate format. Must be a valid ISO 8601 datetime string.', 'INVALID_DATE');
        }
        if (dueDateObj < new Date()) {
          return badRequestResponse('Due date cannot be in the past', 'INVALID_DATE');
        }
      }

      // Convert priority string to number if provided using constants
      const priorityNumber = priority ? TASK_PRIORITY_MAP[priority as TaskPriority] : undefined;

      // Update task in database with timeout protection
      const updatePromise = prisma.task.update({
        where: {
          id: id.trim(),
        },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(dueDate !== undefined && { dueAt: dueDate ? new Date(dueDate) : null }),
          ...(priorityNumber !== undefined && { priority: priorityNumber }),
          ...(status !== undefined && { status }),
          ...(subjectId !== undefined && { subject: subjectId || null }),
        },
      });

      const updateTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database update timeout')), 10000);
      });

      const task = await Promise.race([updatePromise, updateTimeoutPromise]);

      // Invalidate cache and trigger gamification in parallel (non-blocking)
      const wasCompleted = task.status === TASK_STATUS.COMPLETED && existingTask.status !== TASK_STATUS.COMPLETED;
      Promise.allSettled([
        invalidateUserCache(decodedToken.userId),
        wasCompleted ? gamificationService.updateUserProgress(decodedToken.userId, 'task_completed') : Promise.resolve(),
      ]).catch((error) => {
        // Log but don't block response - use console in case logger is not available
        if (process.env.NODE_ENV === 'development') {
          console.warn('Cache invalidation or gamification update failed:', error);
        }
      });

      // Return successful response
      return successResponse(task, 'Task updated successfully');
    } catch (error) {
      return handleApiError(error);
    }
  });
}

// Handle DELETE requests - delete task
export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit(req, MUTATION_RATE_LIMIT, 'delete_task');
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Verify authentication using the unified AuthService
      const verification = await authService.verifyTokenFromRequest(req);
      const decodedToken = verification.isValid && verification.user ? { userId: verification.user.userId } : null;
      if (!decodedToken) {
        return unauthorizedResponse();
      }

      const { searchParams } = new URL(req.url);
      const taskId = searchParams.get('id');

      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        return badRequestResponse('Task ID is required and must be a non-empty string', 'MISSING_TASK_ID');
      }

      const trimmedTaskId = taskId.trim();

      // Check if task belongs to user with timeout protection
      const findPromise = prisma.task.findUnique({
        where: {
          id: trimmedTaskId,
        },
      });

      const findTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const existingTask = await Promise.race([findPromise, findTimeoutPromise]);

      if (!existingTask) {
        return badRequestResponse('Task not found', 'TASK_NOT_FOUND');
      }

      if (existingTask.userId !== decodedToken.userId) {
        return unauthorizedResponse('You do not have permission to delete this task');
      }

      // Delete task from database with timeout protection
      const deletePromise = prisma.task.delete({
        where: {
          id: trimmedTaskId,
        },
      });

      const deleteTimeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => reject(new Error('Database delete timeout')), 10000);
      });

      await Promise.race([deletePromise, deleteTimeoutPromise]);

      // Invalidate cache (non-blocking)
      invalidateUserCache(decodedToken.userId).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Cache invalidation failed:', error);
        }
      });

      // Return successful response
      return successResponse(null, 'Task deleted successfully');
    } catch (error) {
      return handleApiError(error);
    }
  });
}
