import { PluginData } from '../../src/PluginData';
import { createMockNode } from '../mocks/figma.mock';
import { GlobalQuotaManager } from '../../src/core/GlobalQuotaManager';
import { MemoryMonitor } from './utils/memory-monitor';
import { DataGenerator } from './utils/data-generators';

// Using existing NodeJS type for gc
// gc is already declared in @types/node, no need to redeclare

describe('Memory Stability', () => {
  let generator: DataGenerator;
  
  beforeEach(() => {
    GlobalQuotaManager.reset();
    generator = new DataGenerator({ seed: 12345 });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const iterations = 100;
      const monitor = new MemoryMonitor();
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Generate test data
      const testData = generator.generateSmallJSON(10);
      
      monitor.start();
      
      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        storage.setPluginData(`key_${i % 10}`, testData);
        storage.getPluginData(`key_${i % 10}`);
        
        // Take snapshot every 10 iterations
        if (i % 10 === 0) {
          monitor.snapshot();
        }
      }
      
      // Force GC if available
      monitor.forceGC();
      monitor.snapshot();
      
      const analysis = monitor.analyze();
      const leakDetection = monitor.detectLeak(iterations);
      
      console.log('\n=== Memory Leak Test (100 operations) ===');
      console.log(MemoryMonitor.formatAnalysis(analysis));
      console.log(`Leak Detection: ${leakDetection.message}`);
      console.log(`Average growth per operation: ${MemoryMonitor.formatBytes(leakDetection.averageGrowthPerOperation)}`);
      
      expect(leakDetection.hasLeak).toBe(false);
      expect(leakDetection.averageGrowthPerOperation).toBeLessThan(100 * 1024); // Less than 100KB per operation (more realistic)
    });

    it('should not leak memory with large data cycling', async () => {
      const iterations = 20;
      const monitor = new MemoryMonitor();
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Generate large test data (500KB)
      const largeData = generator.generateLargeJSON(0.5);
      
      monitor.start();
      
      // Cycle through large data operations
      for (let i = 0; i < iterations; i++) {
        storage.setPluginData('large_data', largeData);
        storage.getPluginData('large_data');
        storage.deletePluginData('large_data');
        
        // Take snapshot every 5 iterations
        if (i % 5 === 0) {
          monitor.snapshot();
          monitor.forceGC();
        }
      }
      
      monitor.forceGC();
      monitor.snapshot();
      
      const analysis = monitor.analyze();
      const leakDetection = monitor.detectLeak(iterations);
      
      console.log('\n=== Large Data Cycling Test (20 operations) ===');
      console.log(MemoryMonitor.formatAnalysis(analysis));
      console.log(`Leak Detection: ${leakDetection.message}`);
      
      expect(leakDetection.hasLeak).toBe(false);
    });

    it('should release memory when data is deleted', async () => {
      const monitor = new MemoryMonitor();
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      monitor.start();
      
      // Store large amount of data
      const dataSize = 100; // KB
      for (let i = 0; i < 10; i++) {
        const data = generator.generateSmallJSON(dataSize);
        storage.setPluginData(`delete_test_${i}`, data);
      }
      
      monitor.snapshot();
      const afterStorage = monitor.analyze().final.heapUsed;
      
      // Delete all data
      for (let i = 0; i < 10; i++) {
        storage.deletePluginData(`delete_test_${i}`);
      }
      
      monitor.forceGC();
      monitor.snapshot();
      
      const analysis = monitor.analyze();
      const afterDeletion = analysis.final.heapUsed;
      
      console.log('\n=== Memory Release Test ===');
      console.log(`After storage:   ${MemoryMonitor.formatBytes(afterStorage)}`);
      console.log(`After deletion:  ${MemoryMonitor.formatBytes(afterDeletion)}`);
      console.log(`Memory released: ${MemoryMonitor.formatBytes(afterStorage - afterDeletion)}`);
      
      // Memory should be released (allowing for some overhead)
      expect(afterDeletion).toBeLessThan(afterStorage);
    });
  });

  describe('Memory Overhead', () => {
    it('should measure memory overhead for different data sizes', async () => {
      const testSizes = [1, 10, 50, 100, 500]; // KB
      const results: Array<{ size: number; overhead: number; percent: number }> = [];
      
      console.log('\n=== Memory Overhead Analysis ===');
      
      for (const sizeKB of testSizes) {
        const mockNode = createMockNode();
        const storage = new PluginData(mockNode);
        const monitor = new MemoryMonitor();
        
        const data = sizeKB < 100 
          ? generator.generateSmallJSON(sizeKB)
          : generator.generateLargeJSON(sizeKB / 1024);
        
        const dataSize = JSON.stringify(data).length;
        
        monitor.start();
        monitor.forceGC();
        
        const beforeStorage = monitor.analyze().final.heapUsed;
        
        storage.setPluginData('overhead_test', data);
        
        monitor.snapshot();
        const afterStorage = monitor.analyze().final.heapUsed;
        
        const overhead = afterStorage - beforeStorage;
        const overheadPercent = (overhead / dataSize) * 100;
        
        results.push({ size: sizeKB, overhead, percent: overheadPercent });
        
        console.log(`${sizeKB}KB data:`);
        console.log(`  Data size:     ${MemoryMonitor.formatBytes(dataSize)}`);
        console.log(`  Memory used:   ${MemoryMonitor.formatBytes(overhead)}`);
        console.log(`  Overhead:      ${overheadPercent.toFixed(1)}%`);
      }
      
      // Memory overhead should be reasonable (< 10% for large data)
      for (const result of results) {
        if (result.size >= 100) {
          expect(result.percent).toBeLessThan(10);
        }
      }
    });
  });

  describe('Concurrent Operations Memory', () => {
    it('should handle memory efficiently with multiple nodes', async () => {
      const nodeCount = 10;
      const operationsPerNode = 20;
      const monitor = new MemoryMonitor();
      
      monitor.start();
      
      // Create multiple nodes with storage
      const nodes = Array(nodeCount).fill(null).map(() => {
        const node = createMockNode();
        return new PluginData(node);
      });
      
      // Perform operations on all nodes
      for (let op = 0; op < operationsPerNode; op++) {
        for (let i = 0; i < nodeCount; i++) {
          const data = generator.generateSmallJSON(5);
          nodes[i].setPluginData(`key_${op}`, data);
        }
        
        if (op % 5 === 0) {
          monitor.snapshot();
        }
      }
      
      monitor.forceGC();
      monitor.snapshot();
      
      const analysis = monitor.analyze();
      const totalOperations = nodeCount * operationsPerNode;
      const averageGrowth = analysis.heapGrowth / totalOperations;
      
      console.log('\n=== Concurrent Nodes Memory Test ===');
      console.log(`Nodes: ${nodeCount}, Operations per node: ${operationsPerNode}`);
      console.log(MemoryMonitor.formatAnalysis(analysis));
      console.log(`Average growth per operation: ${MemoryMonitor.formatBytes(averageGrowth)}`);
      
      // Should scale linearly with reasonable overhead
      expect(averageGrowth).toBeLessThan(10 * 1024); // Less than 10KB per operation
    });
  });

  describe('Memory Stress Test', () => {
    it('should remain stable under memory pressure', async () => {
      const monitor = new MemoryMonitor();
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      monitor.start();
      
      console.log('\n=== Memory Stress Test ===');
      
      // Fill storage close to quota
      let totalStored = 0;
      const chunks: string[] = [];
      
      try {
        // Try to store up to 4MB of data
        while (totalStored < 4 * 1024 * 1024) {
          const chunkSize = 100; // 100KB chunks
          const data = generator.generateSmallJSON(chunkSize);
          const key = `stress_${chunks.length}`;
          
          storage.setPluginData(key, data);
          chunks.push(key);
          totalStored += JSON.stringify(data).length;
          
          if (chunks.length % 10 === 0) {
            monitor.snapshot();
            console.log(`Stored: ${MemoryMonitor.formatBytes(totalStored)}`);
          }
        }
      } catch (error) {
        console.log(`Storage full at: ${MemoryMonitor.formatBytes(totalStored)}`);
      }
      
      monitor.snapshot();
      const peakMemory = monitor.analyze().peak.heapUsed;
      
      // Clean up
      for (const key of chunks) {
        storage.deletePluginData(key);
      }
      
      monitor.forceGC();
      monitor.snapshot();
      
      const analysis = monitor.analyze();
      const finalMemory = analysis.final.heapUsed;
      
      console.log(`Peak memory:     ${MemoryMonitor.formatBytes(peakMemory)}`);
      console.log(`Final memory:    ${MemoryMonitor.formatBytes(finalMemory)}`);
      console.log(`Memory released: ${MemoryMonitor.formatBytes(peakMemory - finalMemory)}`);
      
      // Should release most memory after cleanup
      const retentionRate = (finalMemory - analysis.initial.heapUsed) / (peakMemory - analysis.initial.heapUsed);
      expect(retentionRate).toBeLessThan(0.2); // Less than 20% retention
    });
  });

  describe('Memory Profiling', () => {
    it('should profile memory usage during typical operations', async () => {
      const operations = [
        { name: 'Store settings', fn: (storage: PluginData) => {
          const data = generator.generatePluginData('settings');
          storage.setPluginData('settings', data);
        }},
        { name: 'Store components', fn: (storage: PluginData) => {
          const data = generator.generatePluginData('components');
          storage.setPluginData('components', data);
        }},
        { name: 'Store tokens', fn: (storage: PluginData) => {
          const data = generator.generatePluginData('tokens');
          storage.setPluginData('tokens', data);
        }},
        { name: 'Update state', fn: (storage: PluginData) => {
          const data = generator.generatePluginData('state');
          storage.setPluginData('state', data);
        }},
        { name: 'Read all data', fn: (storage: PluginData) => {
          storage.getPluginData('settings');
          storage.getPluginData('components');
          storage.getPluginData('tokens');
          storage.getPluginData('state');
        }}
      ];
      
      console.log('\n=== Memory Profile ===');
      
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      for (const { name, fn } of operations) {
        const { memory } = await MemoryMonitor.monitorOperation(
          async () => fn(storage),
          { forceGC: true }
        );
        
        console.log(`\n${name}:`);
        console.log(`  Heap growth: ${MemoryMonitor.formatBytes(memory.heapGrowth)}`);
        console.log(`  Peak usage:  ${MemoryMonitor.formatBytes(memory.peak.heapUsed)}`);
      }
    });
  });
});