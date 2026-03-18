import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { withAuth, handleApiError } from '@/lib/api-utils';

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
                alternativePhone, educationType, section, studyGoal 
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
                birthDate,
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
