import { NextResponse } from 'next/server';
import { logger } from './logger';
import { ERROR_CODES, ErrorCode } from './error-codes';

/**
 * Custom application error class.
 * Use this to throw errors that should be returned to the client.
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number = 500,
    public readonly code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Standardized error handler for the entire application infrastructure.
 * Handles different error types and returns a unified JSON response for API routes.
 */
export function handleError(error: unknown): NextResponse {
  // Log the error with context
  const requestId = typeof window === 'undefined' ? (global as any).currentRequestId : undefined;
  
  if (error instanceof AppError) {
    logger.warn(`[AppError] ${error.code}: ${error.message}`, { 
      status: error.status, 
      details: error.details,
      requestId 
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.status }
    );
  }

  // Handle Prisma-specific errors (if prisma is not imported, we check by name)
  const errorName = (error as Error)?.name;
  if (errorName === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    logger.error('[PrismaError] Known Request Error:', { 
      code: prismaError.code, 
      meta: prismaError.meta,
      requestId 
    });
    
    // P2002: Unique constraint failed
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'تم تقديم بيانات مكررة موجودة بالفعل.',
          code: ERROR_CODES.DUPLICATE_RESOURCE,
        },
        { status: 409 }
      );
    }
    
    // P2025: Record not found
    if (prismaError.code === 'P2025') {
       return NextResponse.json(
        {
          success: false,
          error: 'المورد المطلوب غير موجود.',
          code: ERROR_CODES.NOT_FOUND,
        },
        { status: 404 }
      );
    }
  }

  // Handle Zod Validation Errors
  if (errorName === 'ZodError') {
    const zodError = error as any;
    const details = zodError.errors.map((e: any) => ({
      path: e.path.join('.'),
      message: e.message
    }));
    
    logger.warn('[ValidationError] Zod Error:', { details, requestId });
    return NextResponse.json(
      {
        success: false,
        error: 'خطأ في التحقق من البيانات المرسلة.',
        code: ERROR_CODES.VALIDATION_ERROR,
        details,
      },
      { status: 400 }
    );
  }

  // Handle rate limiting errors (if they come from our rate limiter)
  if ((error as any)?.code === ERROR_CODES.RATE_LIMIT_EXCEEDED) {
     return NextResponse.json(
      {
        success: false,
        error: 'تم تجاوز الحد المسموح به من الطلبات. يرجى المحاولة لاحقاً.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      },
      { status: 429 }
    );
  }

  // Fallback for unexpected errors
  logger.error('[UnhandledError] Uncaught internal error:', {
    message: (error as Error)?.message || String(error),
    stack: (error as Error)?.stack,
    requestId
  });

  return NextResponse.json(
    {
      success: false,
      error: 'حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
      code: ERROR_CODES.INTERNAL_ERROR,
    },
    { status: 500 }
  );
}

/**
 * Standardized success response helper.
 */
export function handleSuccess<T>(data: T, status: number = 200, message?: string): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}
