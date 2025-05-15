import { createClient, RedisClientType } from 'redis';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private static instance: RedisService;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          console.log(`Redis reconnection attempt #${retries}`);
          if (retries > 3) return new Error('Too many retries');
          return Math.min(retries * 1000, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('Redis client disconnected');
      this.isConnected = false;
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) await this.connect();
    
    const data = await this.client.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Error parsing Redis data:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, expireInSeconds?: number): Promise<void> {
    if (!this.isConnected) await this.connect();
    
    const stringValue = JSON.stringify(value);
    
    if (expireInSeconds) {
      await this.client.setEx(key, expireInSeconds, stringValue);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) await this.connect();
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    const result = await this.client.exists(key);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected) await this.connect();
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }
}

export default RedisService.getInstance();