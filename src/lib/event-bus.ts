import { EventHandler } from '../types';

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
  }

  async publish(event: string, payload: any) {
    const handlers = this.handlers.get(event) || [];
    
    await Promise.all(
      handlers.map(handler => {
        try {
          return Promise.resolve(handler(payload))
            .catch(err => console.error(`Error handling event ${event}:`, err));
        } catch (err) {
          console.error(`Sync error handling event ${event}:`, err);
          return Promise.resolve();
        }
      })
    );
  }

  // For batch processing
  async publishBatch(event: string, items: any[]) {
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await this.publish(event, batch);
    }
  }
}
