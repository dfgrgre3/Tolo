/**
 * Cart Domain — Types
 *
 * المالك الوحيد لنماذج السلة. أي شاشة/hook يتعامل مع السلة
 * يجب أن يستورد من هنا بدل تعريف types محلية مكررة.
 */

export interface CartSubject {
  id: string;
  name: string;
  nameAr?: string | null;
  slug?: string | null;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  thumbnailUrl?: string | null;
  instructorName?: string | null;
  rating?: number | null;
}

export interface CartItem {
  id: string;
  subjectId: string;
  subject: CartSubject;
  addedAt?: string | null;
}

export interface Cart {
  items: CartItem[];
  total: number;
  currency: string;
  count: number;
}

export interface CartCoupon {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discount: number;
  message?: string;
}

export interface CartTotals {
  rawTotal: number;
  discountAmount: number;
  finalTotal: number;
  currency: string;
}

export interface CartCheckoutResponse {
  success?: boolean;
  redirectUrl?: string;
  paymentKey?: string;
  iframeId?: string | number;
  fawryCode?: string;
  billReference?: string;
  orderId?: string;
  message?: string;
}

export type CartEnvelope =
  | { items?: CartItem[] }
  | { data?: { items?: CartItem[] } | CartItem[] }
  | CartItem[];
