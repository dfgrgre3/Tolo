import 'server-only';
/**
 * User Repository — billing summary, and settings.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type { User } from '@/types/user';

export interface BillingSummary {
  balance: number;
  aiCredits: number;
  examCredits: number;
  activeSubscription?: {
    id: string;
    planName: string;
    expiresAt: string;
  } | null;
}

export interface UserSettings {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: Record<string, boolean>;
  [key: string]: unknown;
}

// ────────────────────────────────────────────────────────────
// Repository
// ────────────────────────────────────────────────────────────

export const userRepository = {
  /** GET /api/users/billing-summary */
  getBillingSummary: () =>
    apiClient.get<BillingSummary>(apiRoutes.users.billingSummary),

  /** GET /api/users/guest */
  getGuestUser: () =>
    apiClient.get<Partial<User>>(apiRoutes.users.guest),

  /** GET /api/settings/preferences */
  getPreferences: () =>
    apiClient.get<UserSettings>(apiRoutes.settings.preferences),

  /** PATCH /api/settings/preferences */
  updatePreferences: (payload: Partial<UserSettings>) =>
    apiClient.patch<UserSettings>(apiRoutes.settings.preferences, payload),

  /** GET /api/billing/wallet */
  getWalletBalance: () =>
    apiClient.get<{ balance: number }>(apiRoutes.billing.wallet),

  /** GET /api/billing/wallet/transactions */
  getWalletTransactions: (page = 1, limit = 20) =>
    apiClient.get<unknown[]>(
      `${apiRoutes.billing.transactions}?page=${page}&limit=${limit}`
    ),

  /** GET /api/subscriptions/plans */
  getSubscriptionPlans: () =>
    apiClient.get<unknown[]>(apiRoutes.subscriptions.plans),

  /** GET /api/subscriptions */
  getCurrentSubscription: () =>
    apiClient.get<unknown>(apiRoutes.subscriptions.current),

  /** POST /api/coupons/validate */
  validateCoupon: (code: string) =>
    apiClient.post<{ valid: boolean; discount?: number; type?: string }>(
      apiRoutes.coupons.validate,
      { code }
    ),
};
