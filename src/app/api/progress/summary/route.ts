import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

/**
 * GET /api/progress/summary
 * Proxies the request to the Go backend to get progress summary
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Forward the request to the Go backend
        const backendUrl = `${BACKEND_API_URL}/progress/summary?userId=${encodeURIComponent(userId)}`;
        
        // Build headers for the backend request
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward authorization header if present
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        // Forward cookies for authentication
        const cookie = request.headers.get('cookie');
        if (cookie) {
            headers['Cookie'] = cookie;
        }
        
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Backend error (${response.status}):`, errorText);
            
            // If backend is not available or returns error, return default response
            return NextResponse.json({
                totalMinutes: 0,
                averageFocus: 0,
                tasksCompleted: 0,
                streakDays: 0,
            });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in /api/progress/summary:', error);
        
        // Return default values on error to prevent breaking the UI
        return NextResponse.json({
            totalMinutes: 0,
            averageFocus: 0,
            tasksCompleted: 0,
            streakDays: 0,
        });
    }
}
