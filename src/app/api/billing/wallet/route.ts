import { NextRequest, NextResponse } from 'next/server';
import { withAuth, handleApiError, successResponse } from '@/lib/api-utils';
import { WalletService } from '@/services/wallet-service';
import { opsWrapper } from '@/lib/middleware/ops-middleware';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        const balance = await WalletService.getBalance(userId);
        const history = await WalletService.getHistory(userId, limit, offset);

        return successResponse({
          balance,
          history,
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const body = await req.json();
        const { amount, description, metadata } = body;

        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const result = await WalletService.deposit(userId, amount, {
          description: description || 'شحن رصيد المحفظة',
          metadata,
        }) as unknown as { wallet: { balance: number }; transaction: unknown };

        return successResponse({
          message: 'تم شحن الرصيد بنجاح',
          balance: result.wallet.balance,
          transaction: result.transaction,
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
