import { GET, POST } from '@/app/api/study-sessions/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
    prisma: {
        studySession: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

// Mock auth service
jest.mock('@/lib/services/auth-service', () => ({
    authService: {
        verifyTokenFromRequest: jest.fn().mockResolvedValue({
            isValid: true,
            user: {
                id: 'user-1',
                email: 'student@example.com',
                role: 'user',
            },
        }),
    },
}));

// Mock ops middleware
jest.mock('@/lib/middleware/ops-middleware', () => ({
    opsWrapper: jest.fn((req, handler) => handler(req)),
}));

// Mock cache service
jest.mock('@/lib/cache-service-unified', () => ({
    CacheService: {
        getOrSet: jest.fn((key, fetcher) => fetcher()),
        del: jest.fn(),
    },
}));

// Mock api-utils
jest.mock('@/lib/api-utils', () => ({
    applyRateLimit: jest.fn().mockResolvedValue(null),
    handleApiError: jest.fn((error) => {
        const { NextResponse } = require('next/server');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }),
    successResponse: jest.fn((data, message, status) => {
        const { NextResponse } = require('next/server');
        return NextResponse.json({ data, message, success: true }, { status: status || 200 });
    }),
    validateRequestBody: jest.fn().mockResolvedValue({
        success: true,
        data: {
            subjectId: 'subject-1',
            duration: 60,
            notes: 'Study notes',
        },
    }),
    addSecurityHeaders: jest.fn((response) => response),
}));

describe('Study Sessions API Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/study-sessions', () => {
        it('should return user study sessions', async () => {
            const mockSessions = [
                {
                    id: 'session-1',
                    userId: 'user-1',
                    subjectId: 'subject-1',
                    startTime: new Date(),
                    endTime: new Date(),
                    duration: 60,
                    notes: 'Studied math',
                    createdAt: new Date(),
                },
            ];

            (prisma.studySession.findMany as jest.Mock).mockResolvedValue(mockSessions);

            const request = new NextRequest('http://localhost/api/study-sessions', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-token',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect([200, 201]).toContain(response.status);
            expect(data.success).toBe(true);
        });

        it('should require authentication', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: false,
                error: 'Unauthorized',
            });

            const request = new NextRequest('http://localhost/api/study-sessions', {
                method: 'GET',
            });

            const response = await GET(request);
            expect(response.status).toBe(401);
        });

        it('should support pagination', async () => {
            (prisma.studySession.findMany as jest.Mock).mockResolvedValue([]);

            const request = new NextRequest('http://localhost/api/study-sessions?limit=5&offset=10', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-token',
                },
            });

            await GET(request);

            expect(prisma.studySession.findMany).toHaveBeenCalled();
        });
    });

    describe('POST /api/study-sessions', () => {
        it('should create a new study session', async () => {
            const mockSession = {
                id: 'session-new',
                userId: 'user-1',
                subjectId: 'subject-1',
                startTime: new Date(),
                endTime: new Date(),
                duration: 60,
                notes: 'Study notes',
                createdAt: new Date(),
            };

            (prisma.studySession.create as jest.Mock).mockResolvedValue(mockSession);

            const request = new NextRequest('http://localhost/api/study-sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer test-token',
                },
                body: JSON.stringify({
                    subjectId: 'subject-1',
                    duration: 60,
                    notes: 'Study notes',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
        });

        it('should require authentication for creating sessions', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: false,
                error: 'Unauthorized',
            });

            const request = new NextRequest('http://localhost/api/study-sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subjectId: 'subject-1',
                    duration: 60,
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should validate session data', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: true,
                user: { id: 'user-1', email: 'student@example.com' },
            });

            const { validateRequestBody } = require('@/lib/api-utils');
            (validateRequestBody as jest.Mock).mockResolvedValue({
                success: false,
                error: 'Duration is required',
            });

            const request = new NextRequest('http://localhost/api/study-sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer test-token',
                },
                body: JSON.stringify({
                    // Missing duration
                    subjectId: 'subject-1',
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
});
