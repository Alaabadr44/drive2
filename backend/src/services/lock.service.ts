import { redis } from '../config/redis';

export class LockService {
  private static readonly LOCK_PREFIX = 'restaurant:lock:';
  private static readonly CALL_LOCK_TTL = 300; // 5 minutes default TTL

  /**
   * Attempts to acquire a lock for a restaurant call.
   * @param restaurantId The ID of the restaurant to lock.
   * @param callId The ID of the call acquiring the lock.
   * @returns true if lock acquired, false if busy.
   */
  static async acquireCallLock(restaurantId: string, callId: string): Promise<boolean> {
    const key = `${this.LOCK_PREFIX}${restaurantId}`;
    // SET key value EX (expire in seconds) NX (only if not exists)
    const result = await redis.set(key, callId, 'EX', this.CALL_LOCK_TTL, 'NX');
    return result === 'OK';
  }

  /**
   * Releases the lock for a restaurant only if the callId matches.
   * This prevents accidental unlocking by a different call (though unlikely with NX, good practice).
   * @param restaurantId 
   * @param callId 
   */
  static async releaseCallLock(restaurantId: string, callId: string): Promise<void> {
    const key = `${this.LOCK_PREFIX}${restaurantId}`;
    const keyVal = await redis.get(key);
    
    if (keyVal === callId) {
      await redis.del(key);
    }
  }

  /**
   * Forcefully releases a lock (use for admin cleanup or extreme error recovery).
   */
  static async forceReleaseLock(restaurantId: string): Promise<void> {
    const key = `${this.LOCK_PREFIX}${restaurantId}`;
    await redis.del(key);
  }

  /**
   * Checks if a restaurant is currently locked.
   */
  static async isLocked(restaurantId: string): Promise<boolean> {
    const key = `${this.LOCK_PREFIX}${restaurantId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }
}
