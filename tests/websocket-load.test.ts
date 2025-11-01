import WS from 'jest-websocket-mock';
import { wait } from '../src/utils/wait';

describe('WebSocket Load Test', () => {
  const TEST_USERS = 10; // عدد أقل للاختبار
  const WS_URL = 'ws://localhost:8080';
  let server: WS;

  beforeEach(() => {
    server = new WS(WS_URL);
  });

  afterEach(() => {
    WS.clean();
  });

  it('should handle multiple connections', async () => {
    const clients = [];
    
    for (let i = 0; i < TEST_USERS; i++) {
      const client = new WebSocket(WS_URL);
      await server.connected;
      clients.push(client);
      await wait(50);
    }

    clients.forEach(client => client.close());
  }, 15000);
});
