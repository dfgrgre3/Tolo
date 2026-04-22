import { NextRequest } from 'next/server';
import { withAuth, handleApiError, successResponse } from '@/lib/api-utils';
import { InvoiceService } from '@/services/invoice-service';
import { opsWrapper } from '@/lib/middleware/ops-middleware';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const invoices = await InvoiceService.getUserInvoices(userId);
        return successResponse({ invoices });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}