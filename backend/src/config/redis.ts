let redis: any;

try {
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('connect', () => {
    console.log('[REDIS] 🟢 Connected to Redis');
  });

  redis.on('error', (err: Error) => {
    console.error('[REDIS] 🔴 Redis Error:', err);
  });
} catch (e) {
  console.warn('[REDIS] ⚠️ ioredis not found or failed to load. Using mock redis.');
  // Mock redis for development stability
  redis = {
    on: () => {},
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    exists: async () => 0,
    setnx: async () => 1,
    expire: async () => 1,
  };
}

export { redis };
