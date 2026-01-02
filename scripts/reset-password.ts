import { authService } from "../src/lib/services/auth-service";
import { prisma } from "../src/lib/db";

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error("Usage: npx tsx scripts/reset-password.ts <email> <new-password>");
        process.exit(1);
    }

    const [email, newPassword] = args;

    console.log(`Resetting password for user: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error("User not found!");
            process.exit(1);
        }

        const hashedPassword = await authService.hashPassword(newPassword);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
            },
        });

        console.log("Password updated successfully!");

        // Create detailed success message
        console.log("\nSuccess Details:");
        console.log(`- User ID: ${user.id}`);
        console.log(`- Email: ${user.email}`);
        console.log(`- New Password: ${newPassword}`); // Print plain password for verification

    } catch (error) {
        console.error("Error updating password:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
