import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { authService } from '@/lib/auth-service';

async function handler(req: NextRequest) {
    const { credentialId, deviceName } = await req.json();

    if (!credentialId || !deviceName) {
        return NextResponse.json({ error: 'Credential ID and new name are required' }, { status: 400 });
    }
    
    // It's important to ensure that the user renaming the credential is the owner of the credential.
    // It's important to ensure that the user renaming the credential is the owner of the credential.
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

    await prisma.biometricCredential.update({
        where: { id: credential.id },
        data: { deviceName: deviceName },
    });

    return NextResponse.json({ success: true, message: 'Passkey renamed successfully' });
}

export async function PATCH(request: NextRequest) {
    try {
        return await opsWrapper(request, handler);
    } catch (error) {
        logger.error('Error renaming passkey:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
