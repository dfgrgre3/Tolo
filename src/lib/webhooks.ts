import axios from 'axios';

type WebhookEvent = 
  | 'user.registered' 
  | 'payment.received' 
  | 'course.completed'
  | 'analytics.event';

interface WebhookConfig {
  url: string;
  secret: string;
  events: WebhookEvent[];
}

export class WebhookService {
  private webhooks = new Map<string, WebhookConfig>();

  register(id: string, config: WebhookConfig) {
    this.webhooks.set(id, config);
  }

  async trigger(event: WebhookEvent, payload: any) {
    const promises = Array.from(this.webhooks.values())
      .filter(config => config.events.includes(event))
      .map(config => {
        return axios.post(config.url, {
          event,
          data: payload,
          timestamp: new Date().toISOString()
        }, {
          headers: {
            'X-Webhook-Signature': this.generateSignature(config.secret, payload),
            'X-Webhook-Event': event
          }
        });
      });

    return Promise.allSettled(promises);
  }

  private generateSignature(secret: string, payload: any): string {
    // Implementation for generating secure signature
    return '';
  }
}
