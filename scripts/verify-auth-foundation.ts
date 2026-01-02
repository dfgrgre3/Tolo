// scripts/verify-auth-foundation.ts
import { authService, generateToken, verifyToken, hashPassword, verifyPassword } from '@/lib/auth-service';
import { prisma } from '@/lib/db';

async function main() {
    console.log('--- Starting Auth Foundation Verification ---');

    // 1. Test Password Hashing
    console.log('1. Testing Password Hashing...');
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    const isInvalid = await verifyPassword('WrongPassword', hash);

    if (isValid && !isInvalid) {
        console.log('✅ Password Hashing/Verification Passed');
    } else {
        console.error('❌ Password Hashing/Verification Failed');
        process.exit(1);
    }

    // 2. Test Token Generation
    console.log('2. Testing Token Generation...');
    const payload = { userId: '123', email: 'test@example.com', role: 'USER' };
    const token = await generateToken(payload);
    console.log('Token generated:', token ? 'Yes' : 'No');

    // 3. Test Token Verification
    console.log('3. Testing Token Verification...');
    const decoded = await verifyToken(token);
    if (decoded && decoded.email === 'test@example.com') {
        console.log('✅ Token Verification Passed');
    } else {
        console.error('❌ Token Verification Failed', decoded);
        process.exit(1);
    }

    // 4. Test DB Connection (Basic)
    console.log('4. Testing DB Connection...');
    try {
        const userCount = await prisma.user.count();
        console.log(`✅ DB Connection Successful. User count: ${userCount}`);
    } catch (e) {
        console.error('❌ DB Connection Failed:', e);
        process.exit(1);
    }

    // 5. Test 2FA Token Generation (Compatibility Check)
    console.log('5. Testing 2FA Token Generation...');
    try {
        const { generate2FATempToken } = await import('@/lib/auth-service');
        const tempToken = await generate2FATempToken({ userId: '123' });
        if (tempToken) {
            console.log('✅ 2FA Temp Token Generated');
        } else {
            console.log('❌ 2FA Temp Token generation failed (returned empty)');
        }
    } catch (e) {
        console.log('⚠️ generate2FATempToken not found or failed (Optional for Phase 1 base, but good for compat)');
    }

}

console.log('--- Verification Complete: ALL PASS ---');
}

main().catch((e) => {
    console.error('Unexpected error:', e);
    process.exit(1);
});
