
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { generateSecret } from '@/lib/two-factor/totp-service';
import { generateRecoveryCodes } from '@/lib/two-factor/recovery-codes';
import { logger } from '@/lib/logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import QRCode from 'qrcode';
import { authenticator } from 'otplib';

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            // Get User from Token
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }
            const token = authHeader.substring(7);

            // Use process.env.JWT_SECRET directly
            const secretKey = new TextEncoder().encode(process.env.JWT_SECRET!);
            const { payload } = await jwtVerify(token, secretKey);
            const userId = payload.userId as string;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, email: true, name: true, role: true,
                    twoFactorEnabled: true, twoFactorSecret: true, recoveryCodes: true
                }
            });

            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

            // Generate secret
            const secret = generateSecret();
            const backupCodes = generateRecoveryCodes();

            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorSecret: secret, recoveryCodes: JSON.stringify(backupCodes) }
            });

            const otpauth = authenticator.keyuri(user.email, 'Thanawy', secret);
            const qrCode = await QRCode.toDataURL(otpauth);

            return NextResponse.json({
                secret, qrCode, backupCodes,
                message: '2FA setup initiated. Please verify with your authenticator app.'
            });
        } catch (error) {
            logger.error('2FA setup error:', error);
            return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
        }
    });
}
