import { prisma } from "../src/lib/db";

async function main() {
  const userId = "cmnx7lvez0000zw1gonrlq8eo";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
    }
  });

  if (user) {
    console.log("User found:", JSON.stringify(user, null, 2));
  } else {
    console.log("User not found with ID:", userId);
  }
}

main().catch(console.error);
