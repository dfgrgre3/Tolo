import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendJsonResponse } from '@/app/api/auth/_utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get('cookie') || '';

    console.log('[AI Chat] Received request:', JSON.stringify(body, null, 2));

    // Validate request
    if (!body.message && !body.messages) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Extract the last user message
    let userMessage = body.message;
    if (!userMessage && body.messages) {
      const lastUserMessage = body.messages.filter((msg: any) => msg.role === 'user').pop();
      userMessage = lastUserMessage?.content;
    }

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: 'No user message found' },
        { status: 400 }
      );
    }

    // Build backend payload
    const backendPayload: any = {
      message: userMessage,
      stream: body.stream || false,
    };

    // Add conversation ID if provided
    if (body.conversationId) {
      backendPayload.conversationId = body.conversationId;
    }

    console.log('[AI Chat] Calling backend at:', `${BACKEND_URL}/api/ai/chat`);
    console.log('[AI Chat] Backend payload:', JSON.stringify(backendPayload));

    // Handle streaming request
    if (backendPayload.stream) {
      return handleStreamingRequest(backendPayload, cookieHeader);
    }

    // Non-streaming request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader
        },
        body: JSON.stringify(backendPayload),
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[AI Chat] Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Chat] Backend error response:', errorText);
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        return NextResponse.json(
          { 
            success: false, 
            error: (errorData as any).error || 'Failed to communicate with AI assistant'
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('[AI Chat] Backend response data:', JSON.stringify(data));

      return NextResponse.json({
        success: true,
        message: data.reply || 'عذراً، لم أتمكن من الرد على سؤالك',
        conversationId: data.conversationId,
        messageId: data.messageId,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('[AI Chat] Request timed out');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Request timed out. Please try again.'
          },
          { status: 504 }
        );
      }
      
      console.error('[AI Chat] Error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to AI assistant'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[AI Chat] Error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Request timed out. Please try again.'
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to AI assistant'
      },
      { status: 500 }
    );
  }
}

// Handle streaming response from backend
async function handleStreamingRequest(payload: any, cookieHeader: string) {
  const backendUrl = BACKEND_URL;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for streaming

  try {
    const response = await fetch(`${backendUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify(payload),
      credentials: 'include',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: response.status }
      );
    }

    // Check if response is SSE (Server-Sent Events)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      // Return the streaming response directly
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // If not streaming, parse as JSON
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Streaming request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to connect to streaming AI service' },
      { status: 500 }
    );
  }
}

// GET handler for retrieving conversations
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const backendUrl = BACKEND_URL;

    // Handle different actions
    if (action === 'conversations') {
      // Get user's conversations
      const response = await fetch(`${backendUrl}/api/ai/conversations`, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: errorText },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (action === 'conversation') {
      const conversationId = searchParams.get('id');
      if (!conversationId) {
        return NextResponse.json(
          { error: 'Conversation ID is required' },
          { status: 400 }
        );
      }

      const response = await fetch(`${backendUrl}/api/ai/conversation/${conversationId}`, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: errorText },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[AI Chat GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting conversations
export async function DELETE(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const backendUrl = BACKEND_URL;

    const response = await fetch(`${backendUrl}/api/ai/conversation/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookieHeader
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[AI Chat DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}