import { prisma } from "../src/lib/db";

async function main() {
  const userId = "cmnx7lvez0000zw1gonrlq8eo";
  console.log("Fetching user details with complex relations...");
  const start = Date.now();
  
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
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        // ... abbreviated select to match the API ...
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
      },
    });

    const end = Date.now();
    console.log(`Fetch completed in ${end - start}ms`);
    if (user) {
      console.log("User found:", user.email);
      console.log("Counts:", JSON.stringify(user._count, null, 2));
    } else {
      console.log("User not found");
    }
  } catch (err) {
    console.error("Error fetching user:", err);
  }
}

main().catch(console.error);
