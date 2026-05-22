import { User } from './user';

export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'REFUND' | 'AI_USAGE' | 'EXAM_USAGE';

export interface WalletTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    walletType: string; // BALANCE, AI_CREDITS, EXAM_CREDITS
    description: string;
    referenceId?: string | null;
    createdAt: Date | string;

    // Relations (optional depending on API response)
    user?: User;
}
