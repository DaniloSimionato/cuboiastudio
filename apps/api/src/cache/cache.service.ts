import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis | null = null;
  private readonly logger = new Logger(CacheService.name);
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });
        this.redis.on("error", (err) => {
          this.logger.warn(`Redis connection error: ${err.message}`);
        });
      } catch (err: any) {
        this.logger.error(`Failed to initialize Redis client: ${err.message}`);
      }
    } else {
      this.logger.log("REDIS_URL not configured. Using in-memory cache fallback.");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) {
          return JSON.parse(val) as T;
        }
      } catch (err: any) {
        this.logger.warn(`Redis GET failed, falling back to memory: ${err.message}`);
      }
    }

    const cached = this.memoryCache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.value as T;
      }
      this.memoryCache.delete(key);
    }
    return null;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      } catch (err: any) {
        this.logger.warn(`Redis SET failed: ${err.message}`);
      }
    }

    if (this.memoryCache.size >= 1000) {
      const now = Date.now();
      for (const [k, v] of this.memoryCache.entries()) {
        if (v.expiresAt <= now || this.memoryCache.size >= 900) {
          this.memoryCache.delete(k);
        }
      }
    }

    this.memoryCache.set(key, { value, expiresAt });
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
