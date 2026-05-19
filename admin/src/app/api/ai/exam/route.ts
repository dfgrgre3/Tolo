import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '@/app/api/auth/_utils';
import { logger } from '@/lib/logging/unified-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get('cookie') || '';

    logger.info('[AI Exam] Received request:', {
      subject: body.subject,
      year: body.year,
      lesson: body.lesson,
      questionCount: body.questionCount,
      difficulty: body.difficulty
    });

    // Validate required fields
    if (!body.subject || !body.year || !body.lesson) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Subject, year, and lesson are required'
        },
        { status: 400 }
      );
    }

    if (!body.questionCount || body.questionCount < 1 || body.questionCount > 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Question count must be between 1 and 50'
        },
        { status: 400 }
      );
    }

    // Forward the request to backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for AI generation

    let response;
    try {
      response = await fetch(`${BACKEND_URL}/api/ai/exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader
        },
        body: JSON.stringify(body),
        credentials: 'include',
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('[AI Exam] Request timed out');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Request timed out. AI is taking longer than expected. Please try again.'
          },
          { status: 504 }
        );
      }
      
      logger.error('[AI Exam] Network error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to AI exam generation service'
        },
        { status: 500 }
      );
    }

    clearTimeout(timeoutId);

    logger.info('[AI Exam] Backend response status:', response.status);

    if (!response.ok) {
      // Try to parse error as JSON first
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        if (errorData.details) {
          logger.error('[AI Exam] Backend error details:', errorData.details);
        }
      } catch {
        // If not JSON, it might be HTML error page
        const text = await response.text().catch(() => '');
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          errorMessage = `HTTP ${response.status}: Internal Server Error - Server returned non-JSON response (likely HTML error page)`;
          logger.error('[AI Exam] Received HTML response instead of JSON');
        } else {
          errorMessage = text || errorMessage;
        }
      }

      logger.error('[AI Exam] Backend error:', {
        status: response.status,
        error: errorMessage
      });

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    logger.info('[AI Exam] Successfully generated exam', {
      examId: data.examId,
      questionCount: data.questions?.length || 0
    });

    // Backend returns { examId, questions } which matches frontend expectations
    return NextResponse.json({
      success: true,
      examId: data.examId,
      questions: data.questions
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[AI Exam] Error processing request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate exam. Please try again.'
      },
      { status: 500 }
    );
  }
}
