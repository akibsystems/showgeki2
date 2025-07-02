// ================================================================
// Video Thumbnail Queue Manager
// ================================================================

class ThumbnailQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = 0;
  private maxConcurrent = 3; // Limit concurrent video processing

  async add(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const task = this.queue.shift();
    
    if (task) {
      try {
        await task();
      } catch (error) {
        console.warn('Thumbnail queue task error:', error);
      } finally {
        this.processing--;
        this.process(); // Process next item
      }
    }
  }

  clear(): void {
    this.queue = [];
  }
}

export const thumbnailQueue = new ThumbnailQueue();