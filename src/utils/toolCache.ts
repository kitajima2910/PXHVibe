/**
 * Tool result cache - tránh đọc lại file nhiều lần
 * 
 * Cache có TTL và max size để tránh memory leak
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface ToolCacheOptions {
  maxEntries?: number;
  defaultTtlMs?: number;
}

export class ToolResultCache {
  private cache = new Map<string, CacheEntry<string>>();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(options: ToolCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 100;
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000; // 1 phút mặc định
  }

  /**
   * Tạo cache key từ tool name và arguments
   */
  private createKey(toolName: string, args: unknown): string {
    return `${toolName}:${JSON.stringify(args)}`;
  }

  /**
   * Lấy result từ cache
   */
  get(toolName: string, args: unknown): string | undefined {
    const key = this.createKey(toolName, args);
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  /**
   * Lưu result vào cache
   */
  set(toolName: string, args: unknown, value: string, ttlMs?: number): void {
    const key = this.createKey(toolName, args);
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.defaultTtlMs,
    });
  }

  /**
   * Xóa entry khỏi cache
   */
  invalidate(toolName: string, args: unknown): void {
    const key = this.createKey(toolName, args);
    this.cache.delete(key);
  }

  /**
   * Xóa tất cả cache entries cho một tool
   */
  invalidateTool(toolName: string): void {
    const prefix = `${toolName}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Xóa toàn bộ cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Lấy thống kê cache
   */
  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

// Singleton cache instance
export const globalToolCache = new ToolResultCache();

/**
 * Wrapper cho tool execution với cache
 */
export async function executeWithCache(
  toolName: string,
  args: unknown,
  execute: () => Promise<string>,
  cache: ToolResultCache = globalToolCache,
  cacheable: boolean = true,
): Promise<string> {
  // Chỉ cache các tool read-only
  if (!cacheable || !isCacheableTool(toolName)) {
    return execute();
  }
  
  // Try cache first
  const cached = cache.get(toolName, args);
  if (cached !== undefined) {
    return cached;
  }
  
  // Execute and cache result
  const result = await execute();
  cache.set(toolName, args, result);
  
  return result;
}

/**
 * Xác định tool có thể cache được không
 */
function isCacheableTool(toolName: string): boolean {
  const cacheableTools = [
    'read_file',
    'list_files',
    'search_files',
    'grep',
    'glob',
    'get_git_diff',
  ];
  return cacheableTools.includes(toolName);
}
