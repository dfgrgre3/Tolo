import { EventBus } from '../../src/lib/event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should subscribe and publish events', async () => {
    const mockHandler = jest.fn();
    eventBus.subscribe('test.event', mockHandler);
    
    await eventBus.publish('test.event', { data: 'test' });
    
    expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
  });
});
