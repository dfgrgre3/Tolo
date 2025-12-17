import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { authService } from '@/lib/services/auth-service';

async function handler(req: NextRequest) {
    const { credentialId } = await req.json();

    if (!credentialId) {
        return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    // It's important to ensure that the user deleting the credential is the owner of the credential.
    const verification = await authService.verifyTokenFromRequest(req);

    if (!verification.isValid || !verification.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const credential = await prisma.biometricCredential.findUnique({
        where: { credentialId: credentialId },
    });

    if (!credential) {
        return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.userId !== verification.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.biometricCredential.delete({
        where: { id: credential.id },
    });

    // If the user has no more biometric credentials, disable biometric login for them
    const remainingCredentials = await prisma.biometricCredential.count({
        where: { userId: verification.user.id },
    });

    if (remainingCredentials === 0) {
        await prisma.user.update({
            where: { id: verification.user.id },
            data: { biometricEnabled: false },
        });
    }

    return NextResponse.json({ success: true, message: 'Passkey deleted successfully' });
}

export async function DELETE(request: NextRequest) {
    try {
        return await opsWrapper(request, handler);
    } catch (error) {
        logger.error('Error deleting passkey:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
