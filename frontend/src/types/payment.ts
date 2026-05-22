export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface Payment {
  id: string;
  userId: string;
  planId?: string;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  reference: string;
  paymobOrderId?: string;
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Invoice {
  id: string;
  paymentId: string;
  userId: string;
  invoiceNumber: string;
  pdfUrl?: string;
  createdAt: Date | string;
}
