import { prisma } from '@/lib/db';

import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export class InvoiceService {
  /**
   * Create an invoice for a payment
   */
  static async createInvoice(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true, subscription: { include: { plan: true } } }
      });

      if (!payment) throw new Error('Payment not found');

      // Generate invoice number e.g., INV-2024-XXXX
      const date = new Date();
      const invoiceNumber = `INV-${date.getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;

      // Determine items
      const items: InvoiceItem[] = [];

      let description = 'الخدمة المقدمة';
      if (payment.subscription?.plan) {
        description = `اشتراك: ${payment.subscription.plan.nameAr || payment.subscription.plan.name}`;
      } else if (payment.paymentData) {
        try {
          const pd = JSON.parse(payment.paymentData);
          if (pd.target === 'COURSE' && pd.subjectId) {
            const subject = await prisma.subject.findUnique({ where: { id: pd.subjectId } });
            if (subject) description = `دورة: ${subject.nameAr || subject.name}`;
          }
        } catch (_e) {
          logger.warn('Failed to parse payment data while creating invoice');
        }
      }

      items.push({
        description,
        quantity: 1,
        unitPrice: payment.amount,
        total: payment.amount
      });

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          userId: payment.userId,
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status === 'SUCCESS' ? 'PAID' : 'OPEN',
          issueDate: new Date(),
          paidDate: payment.status === 'SUCCESS' ? new Date() : null,
          items: JSON.stringify(items),
          billingDetails: JSON.stringify({
            userName: payment.user.name,
            userEmail: payment.user.email,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId
          })
        }
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice details
   */
  static async getInvoice(invoiceId: string) {
    return await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true, payment: true }
    });
  }

  /**
   * Get user invoices
   */
  static async getUserInvoices(userId: string) {
    return await prisma.invoice.findMany({
      where: { userId },
      orderBy: { issueDate: 'desc' }
    });
  }

  /**
   * Mark invoice as paid
   */
  static async markAsPaid(paymentId: string) {
    return await prisma.invoice.update({
      where: { paymentId },
      data: {
        status: 'PAID',
        paidDate: new Date()
      }
    });
  }
}
