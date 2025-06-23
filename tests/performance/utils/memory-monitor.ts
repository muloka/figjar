export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface MemoryAnalysis {
  initial: MemorySnapshot;
  final: MemorySnapshot;
  peak: MemorySnapshot;
  heapGrowth: number;
  heapGrowthPercent: number;
  externalGrowth: number;
  rssGrowth: number;
  gcCount: number;
  snapshots: MemorySnapshot[];
}

export interface MemoryLeakDetection {
  hasLeak: boolean;
  confidence: number;
  averageGrowthPerOperation: number;
  totalGrowth: number;
  message: string;
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private gcCount = 0;
  private initialSnapshot: MemorySnapshot | null = null;

  constructor() {
    if (global.gc) {
      // Force garbage collection if available
      global.gc();
    }
  }

  private takeSnapshot(): MemorySnapshot {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      // Fallback for browser environment
      return {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      };
    }

    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external || 0,
      rss: usage.rss
    };
  }

  start(): void {
    this.snapshots = [];
    this.gcCount = 0;
    this.forceGC();
    this.initialSnapshot = this.takeSnapshot();
    this.snapshots.push(this.initialSnapshot);
  }

  snapshot(): void {
    this.snapshots.push(this.takeSnapshot());
  }

  forceGC(): void {
    if (global.gc) {
      global.gc();
      this.gcCount++;
      // Wait a bit for GC to complete
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }
    }
  }

  analyze(): MemoryAnalysis {
    if (!this.initialSnapshot || this.snapshots.length < 2) {
      throw new Error('Not enough snapshots for analysis');
    }

    const final = this.snapshots[this.snapshots.length - 1];
    let peak = this.initialSnapshot;

    for (const snapshot of this.snapshots) {
      if (snapshot.heapUsed > peak.heapUsed) {
        peak = snapshot;
      }
    }

    const heapGrowth = final.heapUsed - this.initialSnapshot.heapUsed;
    const heapGrowthPercent = (heapGrowth / this.initialSnapshot.heapUsed) * 100;
    const externalGrowth = final.external - this.initialSnapshot.external;
    const rssGrowth = final.rss - this.initialSnapshot.rss;

    return {
      initial: this.initialSnapshot,
      final,
      peak,
      heapGrowth,
      heapGrowthPercent,
      externalGrowth,
      rssGrowth,
      gcCount: this.gcCount,
      snapshots: [...this.snapshots]
    };
  }

  detectLeak(iterations: number): MemoryLeakDetection {
    const analysis = this.analyze();
    const averageGrowthPerOperation = analysis.heapGrowth / iterations;
    
    // Heuristics for leak detection
    // Consider it a leak if:
    // 1. Average growth per operation is > 1KB
    // 2. Total growth is > 10MB
    // 3. Growth percentage is > 50%
    
    let confidence = 0;
    let hasLeak = false;
    const factors: string[] = [];

    if (averageGrowthPerOperation > 1024) {
      confidence += 40;
      factors.push(`High per-operation growth: ${(averageGrowthPerOperation / 1024).toFixed(2)}KB`);
    }

    if (analysis.heapGrowth > 10 * 1024 * 1024) {
      confidence += 30;
      factors.push(`Large total growth: ${(analysis.heapGrowth / 1024 / 1024).toFixed(2)}MB`);
    }

    if (analysis.heapGrowthPercent > 50) {
      confidence += 30;
      factors.push(`High growth percentage: ${analysis.heapGrowthPercent.toFixed(1)}%`);
    }

    hasLeak = confidence >= 60;

    let message: string;
    if (hasLeak) {
      message = `Potential memory leak detected (confidence: ${confidence}%). ${factors.join(', ')}`;
    } else if (confidence > 30) {
      message = `Memory usage elevated but likely not a leak. ${factors.join(', ')}`;
    } else {
      message = 'Memory usage appears stable';
    }

    return {
      hasLeak,
      confidence,
      averageGrowthPerOperation,
      totalGrowth: analysis.heapGrowth,
      message
    };
  }

  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
  }

  static formatAnalysis(analysis: MemoryAnalysis): string {
    return `
Memory Analysis:
  Initial Heap: ${this.formatBytes(analysis.initial.heapUsed)}
  Final Heap:   ${this.formatBytes(analysis.final.heapUsed)}
  Peak Heap:    ${this.formatBytes(analysis.peak.heapUsed)}
  Heap Growth:  ${this.formatBytes(analysis.heapGrowth)} (${analysis.heapGrowthPercent.toFixed(1)}%)
  RSS Growth:   ${this.formatBytes(analysis.rssGrowth)}
  GC Count:     ${analysis.gcCount}
  Snapshots:    ${analysis.snapshots.length}
`;
  }

  static async monitorOperation<T>(
    operation: () => Promise<T>,
    options: { forceGC?: boolean } = {}
  ): Promise<{ result: T; memory: MemoryAnalysis }> {
    const monitor = new MemoryMonitor();
    
    monitor.start();
    
    if (options.forceGC) {
      monitor.forceGC();
    }
    
    const result = await operation();
    
    if (options.forceGC) {
      monitor.forceGC();
    }
    
    monitor.snapshot();
    
    return {
      result,
      memory: monitor.analyze()
    };
  }
}