import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAdmin,
} from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const { id } = await params;

        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
            permissions: true,
            emailVerified: true,
            phone: true,
            phoneVerified: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true,
            gradeLevel: true,
            educationType: true,
            section: true,
            interestedSubjects: true,
            studyGoal: true,
            bio: true,
            school: true,
            country: true,
            dateOfBirth: true,
            gender: true,
            xp: {
              select: {
                totalXP: true,
                level: true,
                studyXP: true,
                taskXP: true,
                examXP: true,
                challengeXP: true,
                questXP: true,
                seasonXP: true,
              }
            },
            activity: {
              select: {
                currentStreak: true,
                longestStreak: true,
                totalStudyTime: true,
                tasksCompleted: true,
                examsPassed: true,
                pomodoroSessions: true,
                deepWorkSessions: true,
              }
            },
            _count: {
              select: {
                tasks: true,
                studySessions: true,
                achievements: true,
                notifications: true,
                examResults: true,
                subjectEnrollments: true,
                customGoals: true,
                reminders: true,
                sessions: true,
              },
            },
            achievements: {
              take: 5,
              orderBy: { earnedAt: "desc" },
              select: {
                id: true,
                earnedAt: true,
                achievement: {
                  select: {
                    title: true,
                    icon: true,
                    xpReward: true,
                  },
                },
              },
            },
            examResults: {
              take: 5,
              orderBy: { takenAt: "desc" },
              select: {
                id: true,
                score: true,
                takenAt: true,
                exam: {
                  select: {
                    title: true,
                    subject: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            studySessions: {
              take: 5,
              orderBy: { startTime: "desc" },
              select: {
                id: true,
                startTime: true,
                endTime: true,
                durationMin: true,
                focusScore: true,
                subject: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!user) {
          return notFoundResponse("المستخدم غير موجود");
        }

        // Flatten the response because frontend expects these fields at the top level
        const { xp, activity, ...rest } = user as any;
        const flattenedUser = {
          ...rest,
          totalXP: xp?.totalXP || 0,
          level: xp?.level || 1,
          studyXP: xp?.studyXP || 0,
          taskXP: xp?.taskXP || 0,
          examXP: xp?.examXP || 0,
          challengeXP: xp?.challengeXP || 0,
          questXP: xp?.questXP || 0,
          seasonXP: xp?.seasonXP || 0,
          currentStreak: activity?.currentStreak || 0,
          longestStreak: activity?.longestStreak || 0,
          totalStudyTime: activity?.totalStudyTime || 0,
          tasksCompleted: activity?.tasksCompleted || 0,
          examsPassed: activity?.examsPassed || 0,
          pomodoroSessions: activity?.pomodoroSessions || 0,
          deepWorkSessions: activity?.deepWorkSessions || 0,
        };

        return NextResponse.json(flattenedUser);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// PATCH /api/admin/users/[id] - Update user details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const { id } = await params;
        const body = await req.json();

        const existingUser = await prisma.user.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!existingUser) {
          return notFoundResponse("المستخدم غير موجود");
        }

        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
        const username = typeof body.username === "string" ? body.username.trim() || null : undefined;
        const name = typeof body.name === "string" ? body.name.trim() : undefined;

        if (email) {
          const duplicateEmail = await prisma.user.findFirst({
            where: { email, NOT: { id } },
            select: { id: true },
          });

          if (duplicateEmail) {
            return badRequestResponse("البريد الإلكتروني مستخدم بالفعل");
          }
        }

        if (username) {
          const duplicateUsername = await prisma.user.findFirst({
            where: { username, NOT: { id } },
            select: { id: true },
          });

          if (duplicateUsername) {
            return badRequestResponse("اسم المستخدم مستخدم بالفعل");
          }
        }

        const updatedUser = await prisma.user.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(username !== undefined && { username }),
            ...(typeof body.phone === "string" && { phone: body.phone.trim() || null }),
            ...(typeof body.role === "string" && { role: body.role as UserRole }),
            ...(typeof body.bio === "string" && { bio: body.bio.trim() || null }),
            ...(typeof body.gradeLevel === "string" && { gradeLevel: body.gradeLevel || null }),
            ...(typeof body.educationType === "string" && { educationType: body.educationType || null }),
            ...(typeof body.section === "string" && { section: body.section.trim() || null }),
            ...(typeof body.school === "string" && { school: body.school.trim() || null }),
            ...(typeof body.country === "string" && { country: body.country.trim() || null }),
            ...(typeof body.gender === "string" && { gender: body.gender || null }),
            ...(typeof body.studyGoal === "string" && { studyGoal: body.studyGoal.trim() || null }),
            ...(typeof body.emailVerified === "boolean" && {
              emailVerified: body.emailVerified ? new Date() : null,
            }),
            ...(typeof body.phoneVerified === "boolean" && { phoneVerified: body.phoneVerified }),
            ...(typeof body.twoFactorEnabled === "boolean" && {
              twoFactorEnabled: body.twoFactorEnabled,
            }),
          } as any,
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            role: true,
            permissions: true,
            emailVerified: true,
            phone: true,
            phoneVerified: true,
            twoFactorEnabled: true,
          },
        });

        return successResponse(updatedUser, "تم تحديث بيانات المستخدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req: NextRequest) => {
    return withAdmin(req, async () => {
      try {
        const { id } = await params;

        const existingUser = await prisma.user.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!existingUser) {
          return notFoundResponse("المستخدم غير موجود");
        }

        await prisma.user.delete({
          where: { id },
        });

        return successResponse(null, "تم حذف المستخدم بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
