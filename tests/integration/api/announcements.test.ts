import { GET, POST } from '@/app/api/announcements/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
    prisma: {
        announcement: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        mlRecommendation: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    },
}));

// Mock auth service
jest.mock('@/lib/services/auth-service', () => ({
    authService: {
        verifyTokenFromRequest: jest.fn().mockResolvedValue({
            isValid: true,
            user: {
                id: 'admin-1',
                email: 'admin@example.com',
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
    getOrSetEnhanced: jest.fn((key, fetcher) => fetcher()),
}));

// Mock redis
jest.mock('@/lib/redis', () => ({
    default: {
        invalidatePattern: jest.fn(),
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
            title: 'Test Announcement',
            content: 'This is a test announcement content',
            priority: 'normal',
            isActive: true,
        },
    }),
    addSecurityHeaders: jest.fn((response) => response),
    ApiError: class ApiError extends Error {
        status: number;
        constructor(message: string, status: number) {
            super(message);
            this.status = status;
        }
    },
}));

describe('Announcements API Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/announcements', () => {
        it('should return announcements without authentication', async () => {
            const mockAnnouncements = [
                {
                    id: 'announcement-1',
                    title: 'Welcome',
                    content: 'Welcome to our platform!',
                    priority: 'high',
                    isActive: true,
                    createdAt: new Date(),
                },
            ];

            (prisma.announcement.findMany as jest.Mock).mockResolvedValue(mockAnnouncements);

            const request = new NextRequest('http://localhost/api/announcements', {
                method: 'GET',
            });

            const response = await GET(request);
            const data = await response.json();

            expect([200, 201]).toContain(response.status);
            expect(data.success).toBe(true);
        });

        it('should filter by category/priority', async () => {
            (prisma.announcement.findMany as jest.Mock).mockResolvedValue([]);

            const request = new NextRequest('http://localhost/api/announcements?category=urgent&limit=5', {
                method: 'GET',
            });

            await GET(request);

            expect(prisma.announcement.findMany).toHaveBeenCalled();
        });
    });

    describe('POST /api/announcements', () => {
        it('should create announcement with admin authentication', async () => {
            const mockAnnouncement = {
                id: 'announcement-new',
                title: 'Test Announcement',
                content: 'This is a test announcement content',
                priority: 'normal',
                isActive: true,
                createdAt: new Date(),
            };

            (prisma.announcement.create as jest.Mock).mockResolvedValue(mockAnnouncement);

            const request = new NextRequest('http://localhost/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer admin-token',
                },
                body: JSON.stringify({
                    title: 'Test Announcement',
                    content: 'This is a test announcement content',
                    priority: 'normal',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
        });

        it('should require authentication for creating announcements', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: false,
                error: 'Unauthorized',
            });

            const request = new NextRequest('http://localhost/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: 'Test',
                    content: 'Content',
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should require admin role for creating announcements', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: true,
                user: {
                    id: 'user-1',
                    email: 'user@example.com',
                    role: 'user', // Regular user, not admin
                },
            });

            const request = new NextRequest('http://localhost/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer user-token',
                },
                body: JSON.stringify({
                    title: 'Test',
                    content: 'Content',
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(403);
        });

        it('should validate announcement data', async () => {
            const { authService } = require('@/lib/services/auth-service');
            (authService.verifyTokenFromRequest as jest.Mock).mockResolvedValue({
                isValid: true,
                user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
            });

            const { validateRequestBody } = require('@/lib/api-utils');
            (validateRequestBody as jest.Mock).mockResolvedValue({
                success: false,
                error: 'العنوان مطلوب',
            });

            const request = new NextRequest('http://localhost/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    authorization: 'Bearer admin-token',
                },
                body: JSON.stringify({
                    // Missing title
                    content: 'Content',
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
});
