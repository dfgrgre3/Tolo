import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/db';

async function main() {
    console.log('--- Starting Auth Phase 1 Verification ---');

    // 1. Test Password Hashing
    console.log('1. Testing Password Hashing...');
    const password = 'TestPassword123!';
    const hash = await authService.hashPassword(password);
    console.log('   Hash generated:', hash.substring(0, 10) + '...');
    const isValid = await authService.verifyPassword(password, hash);
    console.log('   Verification result:', isValid);
    if (!isValid) throw new Error('Password verification failed');

    // 2. Test Token Generation & Verification
    console.log('2. Testing Token Management...');
    const payload = { userId: 'ver-123', email: 'test@example.com', role: 'user' };
    const token = await authService.generateToken(payload);
    console.log('   Token generated:', token.substring(0, 10) + '...');
    const verifiedPayload = await authService.verifyToken(token);
    console.log('   Verified Payload:', verifiedPayload);
    if (!verifiedPayload || verifiedPayload.userId !== payload.userId) throw new Error('Token verification failed');

    // 3. Test User Creation and Lookup
    console.log('3. Testing User Lookup...');
    // We expect getUserByEmail to exist
    if (typeof authService.getUserByEmail !== 'function') throw new Error('getUserByEmail missing');
    if (typeof authService.createUser !== 'function') throw new Error('createUser missing');

    console.log('--- Verification Successful ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
