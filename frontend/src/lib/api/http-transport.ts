/**
 * HttpTransport Abstraction (P0-8)
 *
 * Decouples URL resolution and network transport between browser and server environments.
 * Browser: routes through Next.js proxy (/api/...) avoiding CORS.
 * Server: routes directly to the Go backend API.
 */

import { getBackendApiUrl } from './backend-url';

export interface HttpTransport {
  resolveUrl(endpoint: string): string;
}

export class BrowserTransport implements HttpTransport {
  resolveUrl(endpoint: string): string {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (normalized.startsWith('/api/')) {
      return normalized;
    }
    return `/api${normalized}`;
  }
}

export class ServerTransport implements HttpTransport {
  resolveUrl(endpoint: string): string {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return getBackendApiUrl(normalized);
  }
}

export function createHttpTransport(): HttpTransport {
  if (typeof window !== 'undefined') {
    return new BrowserTransport();
  }
  return new ServerTransport();
}

export const defaultHttpTransport: HttpTransport = createHttpTransport();
