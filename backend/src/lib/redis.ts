import Redis from 'ioredis';
import { env } from '../config/env.ts';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

export async function connectRedis() {
  try {
    await redis.connect();
    console.log('Redis connected');
  } catch (error) {
    console.warn('Redis is optional and could not connect:', error);
  }
}
