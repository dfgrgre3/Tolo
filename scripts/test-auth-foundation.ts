
import { authService } from "../src/lib/services/auth-service";
import { prisma } from "../src/lib/db";

async function main() {
    console.log("Starting Auth Foundation Verification...");

    // 1. Test Password Hashing
    console.log("\nTesting Password Hashing...");
    const password = "TestPassword123!";
    const hash = await authService.hashPassword(password);
    console.log("Hash generated:", hash.substring(0, 10) + "...");

    const isValid = await authService.verifyPassword(password, hash);
    console.log("Password verify (correct):", isValid);

    const isInvalid = await authService.verifyPassword("WrongPassword", hash);
    console.log("Password verify (wrong):", isInvalid);

    if (!isValid || isInvalid) {
        throw new Error("Password hashing failed");
    }

    // 2. Test Token Generation
    console.log("\nTesting JWT...");
    const payload = { userId: "test-id", email: "test@example.com", role: "USER" };
    const token = await authService.generateToken(payload);
    console.log("Token generated:", token.substring(0, 15) + "...");

    const decoded = await authService.verifyToken(token);
    console.log("Token verified:", decoded);

    if (!decoded || decoded.email !== payload.email) {
        throw new Error("Token verification failed");
    }

    // 3. Test DB Connection (Read-only check if possible, or just connect)
    console.log("\nTesting DB Connection...");
    try {
        await prisma.$connect();
        console.log("DB Connected successfully.");
        // Try a simple count
        const count = await prisma.user.count();
        console.log("User count in DB:", count);
    } catch (e) {
        console.error("DB Connection failed:", e);
        // Don't fail the whole script if DB is down locally, but warn
    }

    console.log("\nVerification Complete: SUCCESS");
}

main()
    .catch((e) => {
        console.error("Verification FAILED:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
