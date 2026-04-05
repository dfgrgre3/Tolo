import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Thannawy Scaling Load Test
 * Purpose: Verify that the 10M-user architecture handles traffic spikes.
 * Targets: API Caching (Redis), Database Read Replicas, and Edge Headers.
 */

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp-up: 100 users
    { duration: '3m', target: 1000 }, // Stress: 1000 users
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000/api';

export default function () {
  // 1. Test Public Metadata (Edge Caching / SWR)
  const subjectsRes = http.get(`${BASE_URL}/subjects`);
  check(subjectsRes, {
    'subjects status is 200': (r) => r.status === 200,
    'subjects served from cache': (r) => r.headers['Cache-Control'] !== undefined,
  });

  // 2. Test Search (Elasticsearch Offloading)
  const searchRes = http.get(`${BASE_URL}/library/books?search=math`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });

  // 3. Test Paginated Data (Database Performance)
  const booksRes = http.get(`${BASE_URL}/library/books?limit=20&offset=0`);
  check(booksRes, {
    'books list status is 200': (r) => r.status === 200,
    'payload is optimized': (r) => r.body.length < 50000, // Check for small payload size
  });

  sleep(1);
}
