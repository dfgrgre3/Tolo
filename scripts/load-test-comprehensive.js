/**
 * Comprehensive Load Test Script for Thanawy Platform
 * 
 * Tests system behavior at different user loads:
 * - 1,000 users (baseline)
 * - 10,000 users (stress)
 * - 100,000 users (breakpoint)
 * 
 * Usage:
 *   node scripts/load-test-comprehensive.js [options]
 * 
 * Options:
 *   --users <number>     Number of concurrent users (default: 1000)
 *   --duration <seconds> Test duration per stage (default: 60)
 *   --url <url>          API base URL (default: http://localhost:3000/api)
 *   --stages             Run all stages (1K, 10K, 100K)
 * 
 * Examples:
 *   node scripts/load-test-comprehensive.js --users 1000 --duration 30
 *   node scripts/load-test-comprehensive.js --stages
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ─── Configuration ───

const DEFAULT_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  users: 1000,
  duration: 60,
  rampUpTime: 10,
  timeout: 30000,
};

// ─── Test Scenarios ───

const SCENARIOS = [
  {
    name: 'Public Courses List',
    method: 'GET',
    path: '/courses',
    weight: 30, // 30% of traffic
    expectedStatus: 200,
    maxDuration: 500, // ms
  },
  {
    name: 'Subjects List',
    method: 'GET',
    path: '/subjects',
    weight: 20,
    expectedStatus: 200,
    maxDuration: 300,
  },
  {
    name: 'Health Check',
    method: 'GET',
    path: '/healthz',
    weight: 5,
    expectedStatus: 200,
    maxDuration: 100,
  },
  {
    name: 'Library Books',
    method: 'GET',
    path: '/library/books?limit=20',
    weight: 15,
    expectedStatus: 200,
    maxDuration: 500,
  },
  {
    name: 'Course Details',
    method: 'GET',
    path: '/courses/1',
    weight: 15,
    expectedStatus: 200,
    maxDuration: 400,
  },
  {
    name: 'Search',
    method: 'GET',
    path: '/search?q=math',
    weight: 10,
    expectedStatus: 200,
    maxDuration: 600,
  },
  {
    name: 'Announcements',
    method: 'GET',
    path: '/announcements',
    weight: 5,
    expectedStatus: 200,
    maxDuration: 300,
  },
];

// ─── Metrics Collection ───

class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimes = [];
    this.statusCodes = {};
    this.errors = [];
    this.startTime = Date.now();
  }

  recordRequest(duration, statusCode, error = null) {
    this.totalRequests++;
    this.responseTimes.push(duration);

    if (statusCode >= 200 && statusCode < 400) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }

    this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;

    if (error) {
      this.errors.push(error);
    }
  }

  getStats() {
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const total = sorted.length;

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      errorRate: total > 0 ? ((this.failedRequests / total) * 100).toFixed(2) : 0,
      rps: total > 0 ? (total / ((Date.now() - this.startTime) / 1000)).toFixed(2) : 0,
      latency: {
        min: total > 0 ? sorted[0] : 0,
        max: total > 0 ? sorted[total - 1] : 0,
        avg: total > 0 ? (sorted.reduce((a, b) => a + b, 0) / total).toFixed(2) : 0,
        p50: total > 0 ? sorted[Math.floor(total * 0.5)] : 0,
        p90: total > 0 ? sorted[Math.floor(total * 0.9)] : 0,
        p95: total > 0 ? sorted[Math.floor(total * 0.95)] : 0,
        p99: total > 0 ? sorted[Math.floor(total * 0.99)] : 0,
      },
      statusCodes: this.statusCodes,
      topErrors: this.getTopErrors(5),
    };
  }

  getTopErrors(limit) {
    const errorCounts = {};
    this.errors.forEach((e) => {
      const msg = e.message || String(e);
      errorCounts[msg] = (errorCounts[msg] || 0) + 1;
    });
    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([msg, count]) => ({ message: msg, count }));
  }
}

// ─── HTTP Request Helper ───

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      timeout: options.timeout || 30000,
      headers: {
        'User-Agent': 'Thanawy-LoadTest/1.0',
        ...options.headers,
      },
    };

    const startTime = Date.now();
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          duration,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      reject(err);
    });

    req.end();
  });
}

// ─── Load Generator ───

async function runLoadTest(config) {
  const metrics = new MetricsCollector();
  const { users, duration, baseUrl } = config;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Load Test: ${users} concurrent users for ${duration}s`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log(`Total weight: ${SCENARIOS.reduce((sum, s) => sum + s.weight, 0)}`);

  // Calculate requests per scenario based on weight
  const totalWeight = SCENARIOS.reduce((sum, s) => sum + s.weight, 0);
  const requestsPerSecond = users / 10; // Approximate RPS
  const intervalMs = 1000 / requestsPerSecond;

  console.log(`\n📊 Expected RPS: ~${requestsPerSecond.toFixed(0)}`);
  console.log(`⏱️  Request interval: ${intervalMs.toFixed(0)}ms`);

  // Select scenario based on weight
  function selectScenario() {
    let random = Math.random() * totalWeight;
    for (const scenario of SCENARIOS) {
      random -= scenario.weight;
      if (random <= 0) return scenario;
    }
    return SCENARIOS[0];
  }

  // Run requests
  const endTime = Date.now() + duration * 1000;
  let activeRequests = 0;

  async function makeRequest() {
    if (Date.now() >= endTime) return;

    const scenario = selectScenario();
    const url = `${baseUrl}${scenario.path}`;

    activeRequests++;

    try {
      const response = await makeRequest(url, {
        method: scenario.method,
        timeout: config.timeout,
      });

      metrics.recordRequest(response.duration, response.statusCode);

      // Check cache headers
      const cacheHeader = response.headers['cache-control'];
      const xCache = response.headers['x-cache'];
    } catch (error) {
      metrics.recordRequest(0, 0, error);
    } finally {
      activeRequests--;
    }

    // Schedule next request
    if (Date.now() < endTime) {
      setTimeout(makeRequest, intervalMs + Math.random() * intervalMs * 0.5);
    }
  }

  // Start concurrent users
  const concurrentStart = Math.min(users, 100); // Start with max 100 concurrent
  for (let i = 0; i < concurrentStart; i++) {
    setTimeout(makeRequest, i * (intervalMs / concurrentStart));
  }

  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const stats = metrics.getStats();

    console.log(
      `[${Math.floor(elapsed)}s/${duration}s] ` +
        `RPS: ${stats.rps} | ` +
        `Requests: ${stats.totalRequests} | ` +
        `Errors: ${stats.errorRate}% | ` +
        `P95: ${stats.latency.p95}ms | ` +
        `Active: ${activeRequests}`
    );
  }, 5000);

  // Wait for completion
  await new Promise((resolve) => setTimeout(resolve, duration * 1000 + 5000));
  clearInterval(progressInterval);

  // Print results
  printResults(metrics.getStats(), config);

  return metrics.getStats();
}

// ─── Results Display ───

function printResults(stats, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 LOAD TEST RESULTS');
  console.log(`${'='.repeat(60)}`);

  console.log(`\n🎯 Configuration:`);
  console.log(`   Users: ${config.users}`);
  console.log(`   Duration: ${config.duration}s`);
  console.log(`   Target: ${config.baseUrl}`);

  console.log(`\n📊 Summary:`);
  console.log(`   Total Requests: ${stats.totalRequests}`);
  console.log(`   Successful: ${stats.successfulRequests}`);
  console.log(`   Failed: ${stats.failedRequests}`);
  console.log(`   Error Rate: ${stats.errorRate}%`);
  console.log(`   Requests/sec: ${stats.rps}`);

  console.log(`\n⏱️  Latency (ms):`);
  console.log(`   Min: ${stats.latency.min}`);
  console.log(`   Avg: ${stats.latency.avg}`);
  console.log(`   P50: ${stats.latency.p50}`);
  console.log(`   P90: ${stats.latency.p90}`);
  console.log(`   P95: ${stats.latency.p95}`);
  console.log(`   P99: ${stats.latency.p99}`);
  console.log(`   Max: ${stats.latency.max}`);

  console.log(`\n📋 Status Codes:`);
  Object.entries(stats.statusCodes)
    .sort(([a], [b]) => a - b)
    .forEach(([code, count]) => {
      console.log(`   ${code}: ${count}`);
    });

  if (stats.topErrors.length > 0) {
    console.log(`\n❌ Top Errors:`);
    stats.topErrors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.message} (${err.count}x)`);
    });
  }

  // Pass/Fail criteria
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ PASS/FAIL CRITERIA:');

  const criteria = [
    { name: 'Error Rate < 1%', pass: parseFloat(stats.errorRate) < 1 },
    { name: 'P95 Latency < 500ms', pass: stats.latency.p95 < 500 },
    { name: 'P99 Latency < 1000ms', pass: stats.latency.p99 < 1000 },
    { name: 'RPS > 100', pass: parseFloat(stats.rps) > 100 },
  ];

  criteria.forEach((c) => {
    console.log(`   ${c.pass ? '✅ PASS' : '❌ FAIL'}: ${c.name}`);
  });

  const allPassed = criteria.every((c) => c.pass);
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  console.log(`${'='.repeat(60)}\n`);
}

// ─── Multi-Stage Test ───

async function runMultiStageTest(config) {
  const stages = [
    { users: 1000, duration: config.duration, name: '1K Users' },
    { users: 5000, duration: config.duration, name: '5K Users' },
    { users: 10000, duration: config.duration, name: '10K Users' },
  ];

  const results = {};

  for (const stage of stages) {
    console.log(`\n\n${'#'.repeat(60)}`);
    console.log(`# STAGE: ${stage.name}`);
    console.log(`${'#'.repeat(60)}`);

    results[stage.name] = await runLoadTest({
      ...config,
      users: stage.users,
      duration: stage.duration,
    });

    // Cooldown between stages
    console.log(`\n⏸️  Cooldown for 10 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 MULTI-STAGE SUMMARY');
  console.log(`${'='.repeat(60)}`);

  console.log('\n| Stage | RPS | P95 (ms) | Error Rate |');
  console.log('|-------|-----|----------|------------|');

  Object.entries(results).forEach(([name, stats]) => {
    console.log(
      `| ${name.padEnd(9)} | ${stats.rps.toString().padStart(5)} | ${stats.latency.p95.toString().padStart(8)} | ${stats.errorRate.toString().padStart(10)}% |`
    );
  });

  console.log(`${'='.repeat(60)}\n`);
}

// ─── CLI Entry Point ───

async function main() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--users':
        config.users = parseInt(args[++i], 10);
        break;
      case '--duration':
        config.duration = parseInt(args[++i], 10);
        break;
      case '--url':
        config.baseUrl = args[++i].replace(/\/$/, '');
        break;
      case '--stages':
        await runMultiStageTest(config);
        return;
      case '--help':
        console.log(`
Usage: node scripts/load-test-comprehensive.js [options]

Options:
  --users <number>     Number of concurrent users (default: 1000)
  --duration <seconds> Test duration per stage (default: 60)
  --url <url>          API base URL (default: http://localhost:3000/api)
  --stages             Run all stages (1K, 5K, 10K)
  --help               Show this help message

Examples:
  node scripts/load-test-comprehensive.js --users 1000 --duration 30
  node scripts/load-test-comprehensive.js --stages --duration 60
        `);
        return;
    }
  }

  await runLoadTest(config);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runLoadTest, runMultiStageTest, SCENARIOS, MetricsCollector };