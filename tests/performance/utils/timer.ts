export interface TimingResult {
  duration: number;
  unit: 'ms' | 'us' | 'ns';
}

export interface BenchmarkResult {
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  samples: number[];
  unit: 'ms';
}

export class PerformanceTimer {
  private static getHighResTime(): bigint {
    if (typeof process !== 'undefined' && process.hrtime && process.hrtime.bigint) {
      return process.hrtime.bigint();
    }
    return BigInt(Math.floor(performance.now() * 1_000_000));
  }

  static measure<T>(fn: () => T): { result: T; timing: TimingResult } {
    const start = this.getHighResTime();
    const result = fn();
    const end = this.getHighResTime();
    
    const durationNs = Number(end - start);
    
    let duration: number;
    let unit: 'ms' | 'us' | 'ns';
    
    if (durationNs >= 1_000_000) {
      duration = durationNs / 1_000_000;
      unit = 'ms';
    } else if (durationNs >= 1_000) {
      duration = durationNs / 1_000;
      unit = 'us';
    } else {
      duration = durationNs;
      unit = 'ns';
    }
    
    return { result, timing: { duration, unit } };
  }

  static async measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; timing: TimingResult }> {
    const start = this.getHighResTime();
    const result = await fn();
    const end = this.getHighResTime();
    
    const durationNs = Number(end - start);
    
    let duration: number;
    let unit: 'ms' | 'us' | 'ns';
    
    if (durationNs >= 1_000_000) {
      duration = durationNs / 1_000_000;
      unit = 'ms';
    } else if (durationNs >= 1_000) {
      duration = durationNs / 1_000;
      unit = 'us';
    } else {
      duration = durationNs;
      unit = 'ns';
    }
    
    return { result, timing: { duration, unit } };
  }

  static benchmark<T>(
    fn: () => T,
    options: { iterations?: number; warmup?: number } = {}
  ): BenchmarkResult {
    const { iterations = 100, warmup = 10 } = options;
    
    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      fn();
    }
    
    // Actual benchmark runs
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const { timing } = this.measure(fn);
      // Convert everything to ms for consistency
      let ms: number;
      if (timing.unit === 'ns') {
        ms = timing.duration / 1_000_000;
      } else if (timing.unit === 'us') {
        ms = timing.duration / 1_000;
      } else {
        ms = timing.duration;
      }
      samples.push(ms);
    }
    
    // Calculate statistics
    samples.sort((a, b) => a - b);
    
    const sum = samples.reduce((acc, val) => acc + val, 0);
    const mean = sum / samples.length;
    const median = samples[Math.floor(samples.length / 2)];
    const min = samples[0];
    const max = samples[samples.length - 1];
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const p99 = samples[Math.floor(samples.length * 0.99)];
    
    return {
      mean,
      median,
      min,
      max,
      p95,
      p99,
      samples,
      unit: 'ms'
    };
  }

  static async benchmarkAsync<T>(
    fn: () => Promise<T>,
    options: { iterations?: number; warmup?: number } = {}
  ): Promise<BenchmarkResult> {
    const { iterations = 100, warmup = 10 } = options;
    
    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await fn();
    }
    
    // Actual benchmark runs
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const { timing } = await this.measureAsync(fn);
      // Convert everything to ms for consistency
      let ms: number;
      if (timing.unit === 'ns') {
        ms = timing.duration / 1_000_000;
      } else if (timing.unit === 'us') {
        ms = timing.duration / 1_000;
      } else {
        ms = timing.duration;
      }
      samples.push(ms);
    }
    
    // Calculate statistics
    samples.sort((a, b) => a - b);
    
    const sum = samples.reduce((acc, val) => acc + val, 0);
    const mean = sum / samples.length;
    const median = samples[Math.floor(samples.length / 2)];
    const min = samples[0];
    const max = samples[samples.length - 1];
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const p99 = samples[Math.floor(samples.length * 0.99)];
    
    return {
      mean,
      median,
      min,
      max,
      p95,
      p99,
      samples,
      unit: 'ms'
    };
  }

  static formatResult(result: BenchmarkResult): string {
    return `
Performance Results:
  Mean:   ${result.mean.toFixed(3)}ms
  Median: ${result.median.toFixed(3)}ms
  Min:    ${result.min.toFixed(3)}ms
  Max:    ${result.max.toFixed(3)}ms
  P95:    ${result.p95.toFixed(3)}ms
  P99:    ${result.p99.toFixed(3)}ms
  Samples: ${result.samples.length}
`;
  }
}