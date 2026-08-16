/**
 * Request batching - nhóm nhiều tool calls cùng loại thành 1 batch
 * 
 * Giảm số lượng requests và tăng hiệu suất
 */

export interface BatchConfig {
  maxBatchSize: number;      // Số items tối đa trong 1 batch
  maxWaitMs: number;         // Thời gian chờ tối đa trước khi flush
  batchableTools: string[];  // Danh sách tools có thể batch
}

export interface BatchItem<TArgs, TResult> {
  args: TArgs;
  resolve: (result: TResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class RequestBatcher<TArgs = unknown, TResult = unknown> {
  private queue: BatchItem<TArgs, TResult>[] = [];
  private timer: NodeJS.Timeout | undefined;
  private config: Required<BatchConfig>;
  private executeBatch: (items: TArgs[]) => Promise<TResult[]>;

  constructor(
    config: BatchConfig,
    executeBatch: (items: TArgs[]) => Promise<TResult[]>,
  ) {
    this.config = {
      maxBatchSize: config.maxBatchSize,
      maxWaitMs: config.maxWaitMs,
      batchableTools: config.batchableTools,
    };
    this.executeBatch = executeBatch;
  }

  /**
   * Thêm request vào queue
   */
  async add(args: TArgs): Promise<TResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        args,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Start timer nếu chưa có
      if (this.timer === undefined) {
        this.timer = setTimeout(() => this.flush(), this.config.maxWaitMs);
      }

      // Flush ngay nếu đạt max batch size
      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Flush tất cả requests trong queue
   */
  async flush(): Promise<void> {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.config.maxBatchSize);
    const argsBatch = batch.map(item => item.args);

    try {
      const results = await this.executeBatch(argsBatch);
      
      // Resolve từng result
      batch.forEach((item, index) => {
        const result = results[index];
        if (result !== undefined) {
          item.resolve(result);
        } else {
          item.reject(new Error('Batch execution failed'));
        }
      });
    } catch (error) {
      // Reject tất cả nếu batch fail
      batch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }

    // Nếu còn items trong queue, tiếp tục flush
    if (this.queue.length > 0) {
      this.timer = setTimeout(() => this.flush(), this.config.maxWaitMs);
    }
  }

  /**
   * Lấy thống kê queue
   */
  getStats(): { queueSize: number; maxBatchSize: number } {
    return {
      queueSize: this.queue.length,
      maxBatchSize: this.config.maxBatchSize,
    };
  }
}

/**
 * Batch processor cho file operations
 */
export class FileOperationBatcher {
  private readBatcher: RequestBatcher<string, string>;
  private writeBatcher: RequestBatcher<{ path: string; content: string }, boolean>;

  constructor() {
    // Batch read operations
    this.readBatcher = new RequestBatcher(
      {
        maxBatchSize: 10,
        maxWaitMs: 100,
        batchableTools: ['read_file'],
      },
      async (paths: string[]) => {
        // Execute batch read
        const results = await Promise.allSettled(
          paths.map(path => this.executeRead(path))
        );
        return results.map(r => 
          r.status === 'fulfilled' ? r.value : ''
        );
      }
    );

    // Batch write operations
    this.writeBatcher = new RequestBatcher(
      {
        maxBatchSize: 5,
        maxWaitMs: 100,
        batchableTools: ['write_file'],
      },
      async (operations: { path: string; content: string }[]) => {
        const results = await Promise.allSettled(
          operations.map(op => this.executeWrite(op.path, op.content))
        );
        return results.map(r => r.status === 'fulfilled');
      }
    );
  }

  /**
   * Batch read multiple files
   */
  async readFiles(paths: string[]): Promise<string[]> {
    return Promise.all(paths.map(path => this.readBatcher.add(path)));
  }

  /**
   * Batch write multiple files
   */
  async writeFiles(operations: { path: string; content: string }[]): Promise<boolean[]> {
    return Promise.all(operations.map(op => this.writeBatcher.add(op)));
  }

  /**
   * Execute single read (override trong subclass)
   */
  protected async executeRead(path: string): Promise<string> {
    // Default implementation - override trong actual usage
    throw new Error('executeRead must be implemented');
  }

  /**
   * Execute single write (override trong subclass)
   */
  protected async executeWrite(path: string, content: string): Promise<boolean> {
    // Default implementation - override trong actual usage
    throw new Error('executeWrite must be implemented');
  }
}

/**
 * Utility function để batch tool calls
 */
export async function batchToolCalls<TArgs, TResult>(
  calls: TArgs[],
  execute: (args: TArgs) => Promise<TResult>,
  batchSize: number = 10,
): Promise<TResult[]> {
  const results: TResult[] = [];
  
  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(args => execute(args))
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push(undefined as TResult); // Or handle error
      }
    });
  }
  
  return results;
}
