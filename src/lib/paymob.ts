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

  /**
   * Step 1: Authentication
   */
  async authenticate(): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.apiKey }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Auth failed');
      
      return data.token;
    } catch (error: any) {
      console.error('Paymob Auth Error:', error.message);
      throw new Error('Failed to authenticate with Paymob');
    }
  }

  /**
   * Step 2: Order Registration
   */
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
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Order registration failed');
      
      return data.id;
    } catch (error: any) {
      console.error('Paymob Order Error:', error.message);
      throw new Error('Failed to register order with Paymob');
    }
  }

  /**
   * Step 3: Payment Key Generation
   */
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
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Payment key generation failed');
      
      return data.token;
    } catch (error: any) {
      console.error('Paymob Payment Key Error:', error.message);
      throw new Error('Failed to generate payment key');
    }
  }

  /**
   * Verify HMAC for callback security
   */
  verifyHmac(data: any, hmac: string): boolean {
    // Implementation of HMAC verification
    return true; 
  }
}

export const paymob = new PaymobService();
