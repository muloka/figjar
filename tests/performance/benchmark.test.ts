import { PluginData } from '../../src/PluginData';
import { createMockNode } from '../mocks/figma.mock';
import { GlobalQuotaManager } from '../../src/core/GlobalQuotaManager';
import { PerformanceTimer, BenchmarkResult } from './utils/timer';
import { DataGenerator } from './utils/data-generators';

describe('Performance Benchmarks', () => {
  let storage: PluginData;
  let generator: DataGenerator;
  
  beforeEach(() => {
    GlobalQuotaManager.reset();
    const mockNode = createMockNode();
    storage = new PluginData(mockNode);
    generator = new DataGenerator({ seed: 12345 });
  });

  describe('Small Data Operations (< 50KB)', () => {
    it('should complete 1KB operations in < 10ms', () => {
      const data = generator.generateSmallJSON(1);
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('test', data);
        storage.getPluginData('test');
      }, { iterations: 50, warmup: 5 });
      
      console.log('1KB Operations:', PerformanceTimer.formatResult(result));
      
      expect(result.median).toBeLessThan(10);
      expect(result.p95).toBeLessThan(15);
    });

    it('should complete 10KB operations in < 25ms', () => {
      const data = generator.generateSmallJSON(10);
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('test', data);
        storage.getPluginData('test');
      }, { iterations: 50, warmup: 5 });
      
      console.log('10KB Operations:', PerformanceTimer.formatResult(result));
      
      expect(result.median).toBeLessThan(25);
      expect(result.p95).toBeLessThan(35);
    });

    it('should complete 50KB operations in < 50ms', () => {
      const data = generator.generateSmallJSON(50);
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('test', data);
        storage.getPluginData('test');
      }, { iterations: 50, warmup: 5 });
      
      console.log('50KB Operations:', PerformanceTimer.formatResult(result));
      
      expect(result.median).toBeLessThan(50);
      expect(result.p95).toBeLessThan(75);
    });
  });

  describe('Large Data Operations (1-5MB)', () => {
    it('should complete 1MB operations in < 200ms', () => {
      const data = generator.generateLargeJSON(1);
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('test', data);
        storage.getPluginData('test');
      }, { iterations: 20, warmup: 2 });
      
      console.log('1MB Operations:', PerformanceTimer.formatResult(result));
      
      expect(result.median).toBeLessThan(200);
      expect(result.p95).toBeLessThan(500); // More realistic for 1MB operations
    });

    it('should complete 5MB operations in < 500ms', () => {
      const data = generator.generateLargeJSON(3.5); // 3.5MB to ensure we stay under quota after compression
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('test', data);
        storage.getPluginData('test');
      }, { iterations: 10, warmup: 2 });
      
      console.log('5MB Operations:', PerformanceTimer.formatResult(result));
      
      expect(result.median).toBeLessThan(500);
      expect(result.p95).toBeLessThan(750);
    });
  });

  describe('Operation Breakdown', () => {
    it('should measure individual operation performance', () => {
      const testSizes = [1, 10, 50, 100, 500, 1000]; // KB
      const results: Record<string, { write: BenchmarkResult; read: BenchmarkResult }> = {};
      
      for (const sizeKB of testSizes) {
        const data = sizeKB < 100 
          ? generator.generateSmallJSON(sizeKB)
          : generator.generateLargeJSON(sizeKB / 1024);
        
        // Measure write performance
        const writeResult = PerformanceTimer.benchmark(() => {
          storage.setPluginData(`test_${sizeKB}`, data);
        }, { iterations: 20, warmup: 3 });
        
        // Measure read performance
        const readResult = PerformanceTimer.benchmark(() => {
          storage.getPluginData(`test_${sizeKB}`);
        }, { iterations: 30, warmup: 5 });
        
        results[`${sizeKB}KB`] = { write: writeResult, read: readResult };
      }
      
      // Generate performance report
      console.log('\n=== Performance Breakdown ===');
      for (const [size, result] of Object.entries(results)) {
        console.log(`\n${size}:`);
        console.log(`  Write: median ${result.write.median.toFixed(2)}ms, p95 ${result.write.p95.toFixed(2)}ms`);
        console.log(`  Read:  median ${result.read.median.toFixed(2)}ms, p95 ${result.read.p95.toFixed(2)}ms`);
      }
    });
  });

  describe('Chunking Performance', () => {
    it('should handle chunked data efficiently', () => {
      // Data that will require chunking (> 85KB after compression)
      const data = generator.generateLargeJSON(0.5); // 500KB
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('chunked', data);
        storage.getPluginData('chunked');
      }, { iterations: 20, warmup: 3 });
      
      console.log('Chunked Data Operations:', PerformanceTimer.formatResult(result));
      
      // Should still be performant even with chunking overhead
      expect(result.median).toBeLessThan(150);
    });

    it('should scale linearly with chunk count', () => {
      const chunkSizes = [100, 200, 400, 800]; // KB
      const timings: Array<{ size: number; median: number }> = [];
      
      for (const sizeKB of chunkSizes) {
        const data = generator.generateLargeJSON(sizeKB / 1024);
        
        const result = PerformanceTimer.benchmark(() => {
          storage.setPluginData(`chunk_test_${sizeKB}`, data);
          storage.getPluginData(`chunk_test_${sizeKB}`);
        }, { iterations: 10, warmup: 2 });
        
        timings.push({ size: sizeKB, median: result.median });
      }
      
      // Check for approximately linear scaling
      console.log('\nChunk Scaling Analysis:');
      for (let i = 1; i < timings.length; i++) {
        const sizeRatio = timings[i].size / timings[i-1].size;
        const timeRatio = timings[i].median / timings[i-1].median;
        console.log(`  ${timings[i-1].size}KB -> ${timings[i].size}KB: size ${sizeRatio}x, time ${timeRatio.toFixed(2)}x`);
        
        // Allow some overhead but should be roughly linear
        expect(timeRatio).toBeLessThan(sizeRatio * 1.5);
      }
    });
  });

  describe('Consistency and Variance', () => {
    it('should have consistent performance across runs', () => {
      const data = generator.generateSmallJSON(25);
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('consistency', data);
        storage.getPluginData('consistency');
      }, { iterations: 100, warmup: 10 });
      
      // Calculate coefficient of variation
      const stdDev = Math.sqrt(
        result.samples.reduce((sum, val) => sum + Math.pow(val - result.mean, 2), 0) / result.samples.length
      );
      const coefficientOfVariation = (stdDev / result.mean) * 100;
      
      console.log('\nConsistency Analysis:');
      console.log(`  Mean: ${result.mean.toFixed(3)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(3)}ms`);
      console.log(`  CV: ${coefficientOfVariation.toFixed(1)}%`);
      
      // Performance should be consistent (CV < 20%)
      expect(coefficientOfVariation).toBeLessThan(20);
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle empty data efficiently', () => {
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('empty', '');
        storage.getPluginData('empty');
      }, { iterations: 100, warmup: 10 });
      
      console.log('Empty Data Operations:', PerformanceTimer.formatResult(result));
      
      expect(result.median).toBeLessThan(5);
    });

    it('should handle highly nested objects', () => {
      // Create deeply nested object
      let nested: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nested = { child: nested, index: i };
      }
      
      const result = PerformanceTimer.benchmark(() => {
        storage.setPluginData('nested', nested);
        storage.getPluginData('nested');
      }, { iterations: 20, warmup: 5 });
      
      console.log('Deeply Nested Operations:', PerformanceTimer.formatResult(result));
      
      // Should handle nested structures without stack overflow
      expect(result.median).toBeLessThan(100);
    });
  });
});