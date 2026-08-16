/**
 * Rate limiting để tránh bị block bởi API providers
 * 
 * Hỗ trợ:
 * - Token bucket algorithm
 * - Configurable limits per provider
 * - Automatic retry with exponential backoff
 */

export interface RateLimitConfig {
  maxRequests: number;      // Số requests tối đa
  windowMs: number;         // Time window (milliseconds)
  retryDelayMs?: number;    // Delay khi bị rate limit
  maxRetries?: number;      // Số lần retry tối đa
}

export interface RateLimiterStats {
  requestsInWindow: number;
  remainingRequests: number;
  windowResetMs: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      retryDelayMs: config.retryDelayMs ?? 1000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * Kiểm tra có thể thực hiện request không
   */
  canMakeRequest(): boolean {
    this.cleanOldRequests();
    return this.requests.length < this.config.maxRequests;
  }

  /**
   * Chờ cho đến khi có thể thực hiện request
   */
  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = this.getTimeUntilNextSlot();
      await sleep(waitTime);
    }
  }

  /**
   * Ghi nhận một request đã được thực hiện
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Thực hiện request với rate limiting và retry
   */
  async executeWithLimit<T>(execute: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this.waitForSlot();
        this.recordRequest();
        return await execute();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(lastError) && attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          await sleep(delay);
          continue;
        }
        
        throw lastError;
      }
    }
    
    throw lastError ?? new Error('Rate limit exceeded');
  }

  /**
   * Lấy thống kê hiện tại
   */
  getStats(): RateLimiterStats {
    this.cleanOldRequests();
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const requestsInWindow = this.requests.filter(t => t > windowStart).length;
    
    const oldestRequest = this.requests[0];
    const windowResetMs = oldestRequest !== undefined
      ? Math.max(0, oldestRequest + this.config.windowMs - now)
      : 0;
    
    return {
      requestsInWindow,
      remainingRequests: Math.max(0, this.config.maxRequests - requestsInWindow),
      windowResetMs,
    };
  }

  /**
   * Xóa các requests ngoài window
   */
  private cleanOldRequests(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requests = this.requests.filter(t => t > cutoff);
  }

  /**
   * Tính thời gian chờ cho slot tiếp theo
   */
  private getTimeUntilNextSlot(): number {
    if (this.requests.length < this.config.maxRequests) {
      return 0;
    }
    
    const oldestRequest = this.requests[0];
    if (oldestRequest === undefined) {
      return 0;
    }
    return Math.max(0, oldestRequest + this.config.windowMs - Date.now() + 1);
  }

  /**
   * Kiểm tra error có phải rate limit error không
   */
  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429') ||
      message.includes('throttle')
    );
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pre-configured rate limiters cho các providers phổ biến
 */
export const rateLimiters = {
  // OpenAI free tier: ~3 requests per minute
  openaiFree: new RateLimiter({
    maxRequests: 3,
    windowMs: 60_000,
    retryDelayMs: 20_000,
    maxRetries: 3,
  }),
  
  // OpenAI paid: ~500 requests per minute
  openaiPaid: new RateLimiter({
    maxRequests: 500,
    windowMs: 60_000,
    retryDelayMs: 1_000,
    maxRetries: 3,
  }),
  
  // Anthropic: ~50 requests per minute
  anthropic: new RateLimiter({
    maxRequests: 50,
    windowMs: 60_000,
    retryDelayMs: 2_000,
    maxRetries: 3,
  }),
  
  // Gemini free: ~60 requests per minute
  geminiFree: new RateLimiter({
    maxRequests: 60,
    windowMs: 60_000,
    retryDelayMs: 1_000,
    maxRetries: 3,
  }),
  
  // Generic conservative limit
  generic: new RateLimiter({
    maxRequests: 30,
    windowMs: 60_000,
    retryDelayMs: 2_000,
    maxRetries: 3,
  }),
};

/**
 * Get rate limiter cho provider
 */
export function getRateLimiter(provider: string): RateLimiter {
  const providerLower = provider.toLowerCase();
  
  if (providerLower.includes('openai')) {
    return providerLower.includes('free') ? rateLimiters.openaiFree : rateLimiters.openaiPaid;
  }
  if (providerLower.includes('anthropic') || providerLower.includes('claude')) {
    return rateLimiters.anthropic;
  }
  if (providerLower.includes('gemini') || providerLower.includes('google')) {
    return rateLimiters.geminiFree;
  }
  
  return rateLimiters.generic;
}
