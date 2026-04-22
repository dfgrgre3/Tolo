import { createHmac } from 'crypto';
import { logger } from '@/lib/logger';

export interface PaymobAuthResponse {
  token: string;
}

export interface PaymobOrderResponse {
  id: number;
}

export interface PaymobPaymentKeyResponse {
  token: string;
}

/**
 * Paymob integration utility for Egyptian payments.
 */
export class PaymobService {
  private apiKey: string;
  private hmacSecret: string;
  private apiUrl: string = 'https://egypt.paymob.com/api';

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY || '';
    this.hmacSecret = process.env.PAYMOB_HMAC_SECRET || '';
  }

  async authenticate(): Promise<string> {
    try {
      const { CacheService } = await import('@/lib/cache');
      const cacheKey = 'external:paymob:auth_token';
      
      // Attempt to retrieve from cache first (High Scalability)
      const cachedToken = await CacheService.get<string>(cacheKey);
      if (cachedToken) return cachedToken;

      const response = await fetch(`${this.apiUrl}/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.apiKey }),
        signal: AbortSignal.timeout(5000), // 5s hard timeout
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Auth failed');

      // Cache the token for 1 hour (usually valid for 24h)
      await CacheService.set(cacheKey, data.token, 3600);

      return data.token;
    } catch (error: any) {
      logger.error('Paymob Auth Error:', error.message);
      throw new Error('Failed to authenticate with Paymob (External API Timeout or Error)');
    }
  }

  async registerOrder(token: string, amountCents: number, merchantOrderId: string): Promise<number> {
    try {
      const response = await fetch(`${this.apiUrl}/ecommerce/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          delivery_needed: "false",
          amount_cents: amountCents,
          currency: "EGP",
          merchant_order_id: merchantOrderId,
          items: [],
        }),
        signal: AbortSignal.timeout(5000),
      });


      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Order registration failed');

      return data.id;
    } catch (error: any) {
      logger.error('Paymob Order Error:', error.message);
      throw new Error('Failed to register order with Paymob');
    }
  }

  async generatePaymentKey(
    token: string,
    orderId: number,
    amountCents: number,
    integrationId: number,
    customerData: {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
    }
  ): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/acceptance/payment_keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: orderId,
          billing_data: {
            apartment: "NA",
            email: customerData.email,
            floor: "NA",
            first_name: customerData.firstName || "Customer",
            street: "NA",
            building: "NA",
            phone_number: customerData.phone || "0123456789",
            shipping_method: "NA",
            postal_code: "NA",
            city: "Cairo",
            country: "EG",
            last_name: customerData.lastName || "User",
            state: "Cairo"
          },
          currency: "EGP",
          integration_id: integrationId,
        }),
        signal: AbortSignal.timeout(5000),
      });


      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Payment key generation failed');

      return data.token;
    } catch (error: any) {
      logger.error('Paymob Payment Key Error:', error.message);
      throw new Error('Failed to generate payment key');
    }
  }

  /**
   * Verify HMAC for callback security.
   * Uses the transaction object fields commonly included by Paymob processed callbacks.
   */
  verifyHmac(data: any, hmac: string): boolean {
    if (!this.hmacSecret || !hmac || !data) {
      return false;
    }

    const source = data.obj ?? data;
    const order = source.order ?? {};
    const billingData = source.source_data ?? {};

    const parts = [
      source.amount_cents,
      source.created_at,
      source.currency,
      source.error_occured,
      source.has_parent_transaction,
      source.id,
      source.integration_id,
      source.is_3d_secure,
      source.is_auth,
      source.is_capture,
      source.is_refunded,
      source.is_standalone_payment,
      source.is_voided,
      order.id,
      order.merchant_order_id ?? source.merchant_order_id,
      source.owner,
      source.pending,
      billingData.pan,
      billingData.sub_type,
      billingData.type,
      source.success,
    ];

    const payload = parts
      .map((value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        return String(value);
      })
      .join('');

    const digest = createHmac('sha512', this.hmacSecret)
      .update(payload)
      .digest('hex');

    return digest.toLowerCase() === hmac.toLowerCase();
  }
}

export const paymob = new PaymobService();
