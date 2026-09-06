import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the Service Worker message protocol helpers in
 * `src/lib/service-worker.ts`.
 *
 * Strategy: stub `navigator.serviceWorker` and `window.MessageChannel`
 * to simulate the SW responding to messages. The helpers must:
 *   1. Resolve with the SW response when the controller is present.
 *   2. Return null/false when no controller is present (caller falls back).
 *   3. Resolve with null when the SW never responds (timeout).
 *   4. Tolerate a throwing `postMessage`.
 */

// Track what was sent so tests can assert on the message shape.
const sentMessages: Array<{ type: string; payload?: unknown }> = [];
const sentPorts: MessagePort[] = [];

/**
 * Simulated SW controller. When `mockResponse` is set, the simulated
 * controller posts it back on the received port; otherwise it stays
 * silent (simulating a SW that crashed).
 */
let mockResponse: { success: boolean; error?: string } | null = null;

const mockController = {
  postMessage: (message: unknown, ports: MessagePort[]) => {
    sentMessages.push({ type: (message as { type: string }).type });
    const port = ports[0];
    if (port) {
      sentPorts.push(port);
      if (mockResponse) {
        // Simulate the SW receiving the message and posting a response
        // back via the channel. In a real browser the SW receives the
        // page's `port2`, calls `port.postMessage(...)` on it, and the
        // page's `port1` fires a `message` event. Our FakeMessageChannel
        // bridges `port2.postMessage` → `port1`'s onmessage listener,
        // so this single line reproduces the round trip.
        queueMicrotask(() => {
          port.postMessage(mockResponse);
        });
      }
      // Otherwise stay silent — simulates a SW that crashed before
      // responding. The timeout in the helper will fire and resolve
      // the promise with `null`.
    }
  },
};

beforeEach(() => {
  sentMessages.length = 0;
  sentPorts.length = 0;
  mockResponse = { success: true };

  // Stub navigator.serviceWorker
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      serviceWorker: {
        controller: mockController,
        getRegistrations: () => Promise.resolve([]),
      },
    },
    configurable: true,
  });

  // Stub MessageChannel (jsdom does not implement it).
  // A real MessageChannel bridges port1 and port2: when one side
  // postMessages, the OTHER side receives a 'message' event. We mirror
  // that contract here so the SW-side mock and the page-side helper
  // actually see each other's posts.
  class FakeMessageChannel {
    port1: MessagePort;
    port2: MessagePort;
    constructor() {
      const port1Listeners: Array<(event: MessageEvent) => void> = [];
      const port2Listeners: Array<(event: MessageEvent) => void> = [];
      let port1OnMessage: ((e: MessageEvent) => void) | null = null;
      let port2OnMessage: ((e: MessageEvent) => void) | null = null;

      const deliver = (
        onProp: ((e: MessageEvent) => void) | null,
        listeners: Array<(event: MessageEvent) => void>,
        ev: MessageEvent,
      ) => {
        if (onProp) onProp(ev);
        listeners.forEach((l) => l(ev));
      };

      this.port1 = {
        onmessage: null,
        postMessage: (data: unknown) => {
          deliver(port2OnMessage, port2Listeners, { data } as MessageEvent);
        },
        start: () => {},
        close: () => {},
        addEventListener: (_: string, l: (e: MessageEvent) => void) => {
          port1Listeners.push(l);
        },
        removeEventListener: () => {},
        dispatchEvent: () => true,
      } as unknown as MessagePort;
      this.port2 = {
        onmessage: null,
        postMessage: (data: unknown) => {
          deliver(port1OnMessage, port1Listeners, { data } as MessageEvent);
        },
        start: () => {},
        close: () => {},
        addEventListener: (_: string, l: (e: MessageEvent) => void) => {
          port2Listeners.push(l);
        },
        removeEventListener: () => {},
        dispatchEvent: () => true,
      } as unknown as MessagePort;

      Object.defineProperty(this.port1, 'onmessage', {
        get: () => port1OnMessage,
        set: (h: ((e: MessageEvent) => void) | null) => {
          port1OnMessage = h;
        },
        configurable: true,
      });
      Object.defineProperty(this.port2, 'onmessage', {
        get: () => port2OnMessage,
        set: (h: ((e: MessageEvent) => void) | null) => {
          port2OnMessage = h;
        },
        configurable: true,
      });

      // Suppress unused warnings — kept to mirror the symmetric pair shape.
      void port1Listeners;
      void port2Listeners;
    }
  }
  (globalThis as unknown as { MessageChannel: typeof MessageChannel }).MessageChannel =
    FakeMessageChannel as unknown as typeof MessageChannel;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('clearAllCachesViaServiceWorker', () => {
  it('sends CLEAR_ALL_CACHES and resolves true on SW success', async () => {
    mockResponse = { success: true };
    const { clearAllCachesViaServiceWorker } = await import('@/lib/service-worker');
    const result = await clearAllCachesViaServiceWorker();
    expect(result).toBe(true);
    expect(sentMessages).toEqual([{ type: 'CLEAR_ALL_CACHES' }]);
  });

  it('resolves false when SW reports failure', async () => {
    mockResponse = { success: false, error: 'quota' };
    const { clearAllCachesViaServiceWorker } = await import('@/lib/service-worker');
    expect(await clearAllCachesViaServiceWorker()).toBe(false);
  });

  it('resolves false when no SW controller is present', async () => {
    (globalThis as unknown as { navigator: { serviceWorker: { controller: null } } }).navigator.serviceWorker.controller =
      null;
    const { clearAllCachesViaServiceWorker } = await import('@/lib/service-worker');
    expect(await clearAllCachesViaServiceWorker()).toBe(false);
    expect(sentMessages).toEqual([]);
  });

  it('resolves false when the SW does not respond before timeout', async () => {
    mockResponse = null; // SW stays silent
    const { clearAllCachesViaServiceWorker } = await import('@/lib/service-worker');
    const result = await clearAllCachesViaServiceWorker();
    expect(result).toBe(false);
  });
});

describe('skipWaitingViaServiceWorker', () => {
  it('sends SKIP_WAITING without a MessageChannel', async () => {
    const { skipWaitingViaServiceWorker } = await import('@/lib/service-worker');
    await skipWaitingViaServiceWorker();
    expect(sentMessages).toEqual([{ type: 'SKIP_WAITING' }]);
    // No port was sent — SKIP_WAITING is fire-and-forget.
    expect(sentPorts).toEqual([]);
  });

  it('is a no-op when no controller is present', async () => {
    (globalThis as unknown as { navigator: { serviceWorker: { controller: null } } }).navigator.serviceWorker.controller =
      null;
    const { skipWaitingViaServiceWorker } = await import('@/lib/service-worker');
    await skipWaitingViaServiceWorker();
    expect(sentMessages).toEqual([]);
  });
});
