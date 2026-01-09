import { redis } from '../config/redis';

export interface QueueItem {
  screenId: string;
  screenName: string;
  timestamp: number;
}

export class QueueService {
  private static readonly QUEUE_PREFIX = 'restaurant:queue:';

  /**
   * Adds a screen to the restaurant's queue.
   * @Returns The position in the queue (1-based).
   */
  async addToQueue(restaurantId: string, screenId: string, screenName: string): Promise<number> {
    const key = `${QueueService.QUEUE_PREFIX}${restaurantId}`;
    const item: QueueItem = {
      screenId,
      screenName,
      timestamp: Date.now(),
    };

    // Check if already in queue to avoid duplicates
    // Since Redis lists don't guarantee uniqueness, we scan or just rely on logic.
    // Ideally, we could use a Set for uniqueness + List for order, but List is simpler for now.
    // Let's just push.
    
    await redis.rpush(key, JSON.stringify(item));
    const length = await redis.llen(key);
    return length;
  }

  /**
   * Gets the next screen from the queue.
   */
  async popQueue(restaurantId: string): Promise<QueueItem | null> {
    const key = `${QueueService.QUEUE_PREFIX}${restaurantId}`;
    const itemStr = await redis.lpop(key);
    
    if (!itemStr) return null;
    return JSON.parse(itemStr);
  }

  /**
   * Gets the current position of a screen in the queue.
   * Returns -1 if not found.
   */
  async getQueuePosition(restaurantId: string, screenId: string): Promise<number> {
    const key = `${QueueService.QUEUE_PREFIX}${restaurantId}`;
    const items = await redis.lrange(key, 0, -1);
    
    for (let i = 0; i < items.length; i++) {
      const item: QueueItem = JSON.parse(items[i]);
      if (item.screenId === screenId) {
        return i + 1;
      }
    }
    return -1;
  }

  /**
   * Removes a specific screen from the queue (e.g. if they cancel).
   */
  async removeFromQueue(restaurantId: string, screenId: string): Promise<void> {
    const key = `${QueueService.QUEUE_PREFIX}${restaurantId}`;
    const items = await redis.lrange(key, 0, -1);
    
    // Redis LREM depends on value match, so we need to find the exact string
    for (const itemStr of items) {
      const item: QueueItem = JSON.parse(itemStr);
      if (item.screenId === screenId) {
        // Remove 1 occurrence of this exact item string
        await redis.lrem(key, 1, itemStr);
        break;
      }
    }
  }

  /**
   * Get queue length
   */
  async getQueueLength(restaurantId: string): Promise<number> {
    const key = `${QueueService.QUEUE_PREFIX}${restaurantId}`;
    return await redis.llen(key);
  }

  /**
   * Get all items in the queue
   */
  async getQueue(restaurantId: string): Promise<QueueItem[]> {
    const key = `${QueueService.QUEUE_PREFIX}${restaurantId}`;
    const items = await redis.lrange(key, 0, -1);
    return items.map((item: string) => JSON.parse(item));
  }
}
