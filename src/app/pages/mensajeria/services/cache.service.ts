import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in milliseconds
  cleanupInterval: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private cacheSubjects = new Map<string, BehaviorSubject<any>>();
  private config: CacheConfig = {
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000 // 1 minute
  };

  constructor() {
    this.startCleanupTimer();
  }

  // Get data from cache or execute provider function
  get<T>(key: string, provider: () => Observable<T>, ttl?: number): Observable<T> {
    const cacheKey = this.generateKey(key);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if valid
    if (cached && now < cached.expiry) {
      return of(cached.data);
    }

    // Get or create subject for this key
    let subject = this.cacheSubjects.get(cacheKey);
    if (!subject) {
      subject = new BehaviorSubject<T | null>(null);
      this.cacheSubjects.set(cacheKey, subject);

      // Execute provider and cache result
      provider().pipe(
        tap(data => {
          this.set(key, data, ttl);
          subject!.next(data);
        })
      ).subscribe();
    }

    return subject.asObservable().pipe(
      switchMap(data => data ? of(data) : provider().pipe(
        tap(result => {
          this.set(key, result, ttl);
          subject!.next(result);
        })
      ))
    );
  }

  // Set data in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const cacheKey = this.generateKey(key);
    const now = Date.now();
    const expiry = now + (ttl || this.config.defaultTTL);

    // Remove oldest items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiry,
      key: cacheKey
    };

    this.cache.set(cacheKey, cacheItem);

    // Update subject if exists
    const subject = this.cacheSubjects.get(cacheKey);
    if (subject) {
      subject.next(data);
    }
  }

  // Get data from cache (synchronous)
  getSync<T>(key: string): T | null {
    const cacheKey = this.generateKey(key);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && now < cached.expiry) {
      return cached.data;
    }

    return null;
  }

  // Check if key exists in cache
  has(key: string): boolean {
    const cacheKey = this.generateKey(key);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    return cached ? now < cached.expiry : false;
  }

  // Remove item from cache
  delete(key: string): boolean {
    const cacheKey = this.generateKey(key);
    const subject = this.cacheSubjects.get(cacheKey);
    
    if (subject) {
      subject.complete();
      this.cacheSubjects.delete(cacheKey);
    }

    return this.cache.delete(cacheKey);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.cacheSubjects.forEach(subject => subject.complete());
    this.cacheSubjects.clear();
  }

  // Clear cache by pattern
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      const subject = this.cacheSubjects.get(key);
      if (subject) {
        subject.complete();
        this.cacheSubjects.delete(key);
      }
      this.cache.delete(key);
    });
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  } {
    let oldest: number | null = null;
    let newest: number | null = null;
    let totalHits = 0;
    let totalRequests = 0;

    this.cache.forEach(item => {
      if (oldest === null || item.timestamp < oldest) {
        oldest = item.timestamp;
      }
      if (newest === null || item.timestamp > newest) {
        newest = item.timestamp;
      }
    });

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      oldestItem: oldest ? new Date(oldest) : null,
      newestItem: newest ? new Date(newest) : null
    };
  }

  // Invalidate cache for specific patterns
  invalidateMessages(): void {
    this.clearByPattern('messages.*');
  }

  invalidateConversations(): void {
    this.clearByPattern('conversations.*');
  }

  invalidateFolders(): void {
    this.clearByPattern('folders.*');
  }

  invalidateTemplates(): void {
    this.clearByPattern('templates.*');
  }

  // Preload data
  preload<T>(key: string, provider: () => Observable<T>, ttl?: number): void {
    if (!this.has(key)) {
      this.get(key, provider, ttl).subscribe();
    }
  }

  // Batch operations
  setMany<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    items.forEach(item => {
      this.set(item.key, item.data, item.ttl);
    });
  }

  getMany<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.getSync<T>(key)
    }));
  }

  // Private methods
  private generateKey(key: string): string {
    return `mensajeria:${key}`;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const keyToDelete = oldestKey.replace('mensajeria:', '');
      this.delete(keyToDelete);
    }
  }

  private startCleanupTimer(): void {
    timer(this.config.cleanupInterval, this.config.cleanupInterval)
      .subscribe(() => {
        this.cleanup();
      });
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((item, key) => {
      if (now >= item.expiry) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      const subject = this.cacheSubjects.get(key);
      if (subject) {
        subject.complete();
        this.cacheSubjects.delete(key);
      }
      this.cache.delete(key);
    });
  }

  // Configuration
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }
}

// Cache decorators for methods
export function Cacheable(key: string, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      const cacheService = (this as any).cacheService || (this as any).injector?.get(CacheService);
      if (!cacheService) {
        return method.apply(this, args);
      }

      const cacheKey = `${key}:${JSON.stringify(args)}`;
      return cacheService.get(cacheKey, () => method.apply(this, args), ttl);
    };

    return descriptor;
  };
}

// Cache invalidation decorator
export function InvalidateCache(patterns: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      const result = method.apply(this, args);
      const cacheService = (this as any).cacheService || (this as any).injector?.get(CacheService);
      
      if (cacheService) {
        patterns.forEach(pattern => {
          cacheService.clearByPattern(pattern);
        });
      }

      return result;
    };

    return descriptor;
  };
}