import { GET, POST } from '@/app/api/contests/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
    prisma: {
        contest: {
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
                email: 'test@example.com',
                role: 'admin',
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
            title: 'Test Contest',
            description: 'Test Description for the contest',
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-01-31T23:59:59Z',
        },
    }),
    addSecurityHeaders: jest.fn((response) => response),
}));

describe('Contests API Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/contests', () => {
        it('should return all contests', async () => {
            const mockContests = [
                {
                    id: 'contest-1',
                    title: 'Math Competition',
                    description: 'Annual math competition',
                    startDate: new Date('2025-01-01'),
                    endDate: new Date('2025-01-31'),
                    prizes: '["First Place: $1000"]',
                    createdAt: new Date(),
                },
                {
                    id: 'contest-2',
                    title: 'Science Fair',
                    description: 'Science project showcase',
                    startDate: new Date('2025-02-01'),
                    endDate: new Date('2025-02-28'),
                    prizes: '["Best Project: $500"]',
                    createdAt: new Date(),
                },
            ];

            (prisma.contest.findMany as jest.Mock).mockResolvedValue(mockContests);

            const request = new NextRequest('http://localhost/api/contests', {
                method: 'GET',
            });

            const response = await GET(request);
            const data = await response.json();

            expect([200, 201]).toContain(response.status);
            expect(data.success).toBe(true);
        });

        it('should apply rate limiting', async () => {
            const request = new NextRequest('http://localhost/api/contests', {
                method: 'GET',
            });

            await GET(request);

            const { applyRateLimit } = require('@/lib/api-utils');
            expect(applyRateLimit).toHaveBeenCalled();
        });
    });

    describe('POST /api/contests', () => {
        it('should create a new contest with valid data', async () => {
            const mockContest = {
                id: 'contest-new',
                title: 'Test Contest',
                description: 'Test Description for the contest',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2025-01-31'),
                prizes: null,
                createdAt: new Date(),
            };

            (prisma.contest.create as jest.Mock).mockResolvedValue(mockContest);

            const request = new NextRequest('http://localhost/api/contests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer test-token',
                },
                body: JSON.stringify({
                    title: 'Test Contest',
                    description: 'Test Description for the contest',
                    startDate: '2025-01-01T00:00:00Z',
                    endDate: '2025-01-31T23:59:59Z',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
        });

        it('should require authentication', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: false,
                error: 'Unauthorized',
            });

            const request = new NextRequest('http://localhost/api/contests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: 'Test Contest',
                    description: 'Test Description',
                    startDate: '2025-01-01T00:00:00Z',
                    endDate: '2025-01-31T23:59:59Z',
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should validate contest data', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: true,
                user: { id: 'user-1', email: 'test@example.com', role: 'admin' },
            });

            const { validateRequestBody } = require('@/lib/api-utils');
            (validateRequestBody as jest.Mock).mockResolvedValue({
                success: false,
                error: 'Title must be at least 3 characters',
            });

            const request = new NextRequest('http://localhost/api/contests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer test-token',
                },
                body: JSON.stringify({
                    title: 'AB', // Too short
                    description: 'Test',
                    startDate: '2025-01-01',
                    endDate: '2025-01-31',
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
});
