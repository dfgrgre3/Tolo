import { NextRequest, NextResponse } from 'next/server';
import { withAuth, handleApiError } from '@/lib/api-utils';
import { AuthService } from '@/services/auth/auth-service';
import { prisma } from '@/lib/db';

/**
 * GET /api/user/profile
 * 
 * Retrieves the currently authenticated user's profile information.
 */
export async function GET(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    username: true,
                    avatar: true,
                    role: true,
                    phone: true,
                    createdAt: true,
                    totalXP: true,
                    level: true,
                    currentStreak: true,
                    _count: {
                        select: {
                            tasks: true,
                            studySessions: true,
                            achievements: true,
                        },
                    },
                },
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, user }, { status: 200 });
        } catch (error) {
            return handleApiError(error);
        }
    });
}

/**
 * PATCH /api/user/profile
 * 
 * Updates the currently authenticated user's profile information.
 */
export async function PATCH(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const body = await req.json();

            // Validate input (could add more robust validation here)
            const {
                name, username, phone, avatar, bio, school, grade,
                gradeLevel, city, birthDate, gender, country,
                alternativePhone, educationType, section, studyGoal,
                dateOfBirth
            } = body;

            const updatedUser = await AuthService.updateProfile(userId, {
                name,
                username,
                phone,
                avatar,
                bio,
                school,
                grade,
                gradeLevel,
                city,
                birthDate: birthDate || dateOfBirth,
                gender,
                country,
                alternativePhone,
                educationType,
                section,
                studyGoal,
            });

            return NextResponse.json({
                success: true,
                user: updatedUser,
                message: 'Profile updated successfully'
            }, { status: 200 });
        } catch (error) {
            return handleApiError(error);
        }
    });
}
