import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        totalXP: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        totalStudyTime: true,
        tasksCompleted: true,
        examsPassed: true,
        pomodoroSessions: true,
        deepWorkSessions: true,
        studyXP: true,
        taskXP: true,
        examXP: true,
        challengeXP: true,
        questXP: true,
        seasonXP: true,
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
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات المستخدم" },
      { status: 500 }
    );
  }
}
