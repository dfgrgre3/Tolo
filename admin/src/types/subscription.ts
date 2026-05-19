export type SubscriptionInterval = 'MONTHLY' | 'YEARLY' | 'FOREVER';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: SubscriptionInterval;
  features: any; // JSON object representing features
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date | string;
  endDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
