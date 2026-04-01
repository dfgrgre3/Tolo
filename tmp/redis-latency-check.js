const Redis = require('ioredis');
const crypto = require('crypto');

const redisUrl = "redis://default:CG1xOpG2d2K9dki0OavkUUdsad2PAlsP@redis-13287.c270.us-east-1-3.ec2.cloud.redislabs.com:13287";

async function run() {
  console.log('Connecting to Redis Labs...');
  const start = Date.now();
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });

  try {
    await redis.ping();
    const connected = Date.now();
    console.log(`Connected in ${connected - start}ms`);

    const p1Start = Date.now();
    await redis.get('test-key');
    const p1End = Date.now();
    console.log(`GET latency: ${p1End - p1Start}ms`);

    const multiStart = Date.now();
    await redis.multi()
      .get('key1')
      .get('key2')
      .exec();
    const multiEnd = Date.now();
    console.log(`MULTI latency: ${multiEnd - multiStart}ms`);

  } catch (err) {
    console.error('Redis error:', err);
  } finally {
    redis.disconnect();
  }
}

run();
