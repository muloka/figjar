import { PluginData } from '../../src/PluginData';
import { createMockNode } from '../mocks/figma.mock';
import { GlobalQuotaManager } from '../../src/core/GlobalQuotaManager';
import { PerformanceTimer } from './utils/timer';
import { MemoryMonitor } from './utils/memory-monitor';
import { DataGenerator } from './utils/data-generators';

describe('Performance Comparison - figjar vs Native API', () => {
  let generator: DataGenerator;
  
  beforeEach(() => {
    GlobalQuotaManager.reset();
    generator = new DataGenerator({ seed: 12345 });
  });

  describe('Storage Capacity Comparison', () => {
    it('should store 10x more data than native API', () => {
      const mockNode = createMockNode();
      const figjarStorage = new PluginData(mockNode);
      
      console.log('\n=== Storage Capacity Comparison ===');
      
      // Native API limit test (100KB per key)
      const nativeMaxSize = 95 * 1024; // ~95KB to be safe
      const nativeData = generator.randomString(nativeMaxSize);
      
      try {
        mockNode.setPluginData('native_max', nativeData);
        console.log(`Native API: Successfully stored ${(nativeMaxSize / 1024).toFixed(2)}KB`);
      } catch (error) {
        console.log(`Native API: Failed to store ${(nativeMaxSize / 1024).toFixed(2)}KB`);
      }
      
      // figjar capacity test
      const figjarData = generator.generateLargeJSON(4.5); // 4.5MB to leave room for overhead
      try {
        figjarStorage.setPluginData('figjar_large', figjarData);
        const stored = figjarStorage.getPluginData('figjar_large');
        const success = JSON.stringify(stored).length > 4 * 1024 * 1024;
        console.log(`figjar: Successfully stored 5MB data: ${success}`);
        expect(success).toBe(true);
      } catch (error) {
        console.log(`figjar: Failed to store 5MB - ${(error as Error).message}`);
        throw error;
      }
    });
  });

  describe('Operation Speed Comparison', () => {
    it('should compare read/write speeds for small data', () => {
      const mockNode = createMockNode();
      const figjarStorage = new PluginData(mockNode);
      
      // Test data sizes that work with native API
      const testSizes = [1, 10, 50, 90]; // KB
      
      console.log('\n=== Speed Comparison (Small Data) ===');
      console.log('Size  | Native Write | Native Read | figjar Write | figjar Read');
      console.log('------|--------------|-------------|--------------|-------------');
      
      for (const sizeKB of testSizes) {
        const data = generator.generateSmallJSON(sizeKB);
        const jsonString = JSON.stringify(data);
        
        // Native API performance
        const nativeWrite = PerformanceTimer.benchmark(() => {
          mockNode.setPluginData(`native_${sizeKB}`, jsonString);
        }, { iterations: 50, warmup: 10 });
        
        const nativeRead = PerformanceTimer.benchmark(() => {
          const raw = mockNode.getPluginData(`native_${sizeKB}`);
          JSON.parse(raw);
        }, { iterations: 50, warmup: 10 });
        
        // figjar performance
        const figjarWrite = PerformanceTimer.benchmark(() => {
          figjarStorage.setPluginData(`figjar_${sizeKB}`, data);
        }, { iterations: 50, warmup: 10 });
        
        const figjarRead = PerformanceTimer.benchmark(() => {
          figjarStorage.getPluginData(`figjar_${sizeKB}`);
        }, { iterations: 50, warmup: 10 });
        
        console.log(
          `${sizeKB.toString().padEnd(5)}KB | ` +
          `${nativeWrite.median.toFixed(2).padStart(10)}ms | ` +
          `${nativeRead.median.toFixed(2).padStart(10)}ms | ` +
          `${figjarWrite.median.toFixed(2).padStart(10)}ms | ` +
          `${figjarRead.median.toFixed(2).padStart(10)}ms`
        );
      }
    });

    it('should show performance advantage for large data', () => {
      const mockNode = createMockNode();
      const figjarStorage = new PluginData(mockNode);
      
      console.log('\n=== Large Data Handling ===');
      
      // Native API with chunking workaround
      const largeData = generator.generateLargeJSON(0.5); // 500KB
      const jsonString = JSON.stringify(largeData);
      const chunkSize = 90 * 1024; // 90KB chunks
      const chunks = Math.ceil(jsonString.length / chunkSize);
      
      // Native API manual chunking
      const nativeChunkingResult = PerformanceTimer.measure(() => {
        for (let i = 0; i < chunks; i++) {
          const chunk = jsonString.slice(i * chunkSize, (i + 1) * chunkSize);
          mockNode.setPluginData(`native_chunk_${i}`, chunk);
        }
        
        // Read and reassemble
        let reassembled = '';
        for (let i = 0; i < chunks; i++) {
          reassembled += mockNode.getPluginData(`native_chunk_${i}`);
        }
        JSON.parse(reassembled);
      });
      
      // figjar automatic handling
      const figjarResult = PerformanceTimer.measure(() => {
        figjarStorage.setPluginData('large_data', largeData);
        figjarStorage.getPluginData('large_data');
      });
      
      console.log(`Native API (manual chunking):`);
      console.log(`  Chunks required: ${chunks}`);
      console.log(`  Total time: ${nativeChunkingResult.timing.duration.toFixed(2)}ms`);
      
      console.log(`\nfigjar (automatic):`);
      console.log(`  Total time: ${figjarResult.timing.duration.toFixed(2)}ms`);
      console.log(`  Performance gain: ${(nativeChunkingResult.timing.duration / figjarResult.timing.duration).toFixed(2)}x faster`);
      
      expect(figjarResult.timing.duration).toBeLessThan(nativeChunkingResult.timing.duration);
    });
  });

  describe('Memory Usage Comparison', () => {
    it('should compare memory efficiency', async () => {
      console.log('\n=== Memory Usage Comparison ===');
      
      // Test with 50KB data
      const testData = generator.generateSmallJSON(50);
      const jsonString = JSON.stringify(testData);
      
      // Native API memory usage
      const nativeNode = createMockNode();
      const nativeMemory = await MemoryMonitor.monitorOperation(async () => {
        // Store with native API
        nativeNode.setPluginData('native_memory_test', jsonString);
        
        // Read with native API
        const retrieved = nativeNode.getPluginData('native_memory_test');
        JSON.parse(retrieved);
      }, { forceGC: true });
      
      // figjar memory usage
      const figjarNode = createMockNode();
      const figjarStorage = new PluginData(figjarNode);
      const figjarMemory = await MemoryMonitor.monitorOperation(async () => {
        // Store with figjar
        figjarStorage.setPluginData('figjar_memory_test', testData);
        
        // Read with figjar
        figjarStorage.getPluginData('figjar_memory_test');
      }, { forceGC: true });
      
      console.log('Native API:');
      console.log(`  Heap growth: ${MemoryMonitor.formatBytes(nativeMemory.memory.heapGrowth)}`);
      console.log(`  Peak usage: ${MemoryMonitor.formatBytes(nativeMemory.memory.peak.heapUsed)}`);
      
      console.log('\nfigjar:');
      console.log(`  Heap growth: ${MemoryMonitor.formatBytes(figjarMemory.memory.heapGrowth)}`);
      console.log(`  Peak usage: ${MemoryMonitor.formatBytes(figjarMemory.memory.peak.heapUsed)}`);
      
      const overhead = ((figjarMemory.memory.heapGrowth - nativeMemory.memory.heapGrowth) / nativeMemory.memory.heapGrowth) * 100;
      console.log(`\nMemory overhead: ${overhead.toFixed(1)}%`);
    });
  });

  describe('Feature Comparison', () => {
    it('should demonstrate figjar advantages', () => {
      const mockNode = createMockNode();
      const figjarStorage = new PluginData(mockNode);
      
      console.log('\n=== Feature Comparison ===');
      
      // 1. Automatic serialization
      console.log('\n1. Automatic Serialization:');
      const complexObject = {
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        date: new Date().toISOString()
      };
      
      // Native requires manual serialization
      const nativeSerialize = PerformanceTimer.measure(() => {
        mockNode.setPluginData('native_complex', JSON.stringify(complexObject));
        JSON.parse(mockNode.getPluginData('native_complex'));
      });
      
      // figjar handles automatically
      const figjarSerialize = PerformanceTimer.measure(() => {
        figjarStorage.setPluginData('figjar_complex', complexObject);
        figjarStorage.getPluginData('figjar_complex');
      });
      
      console.log(`  Native (manual): ${nativeSerialize.timing.duration.toFixed(2)}ms`);
      console.log(`  figjar (auto): ${figjarSerialize.timing.duration.toFixed(2)}ms`);
      
      // 2. Compression benefits
      console.log('\n2. Storage Efficiency:');
      const repetitiveData = generator.generateRepetitiveData(50);
      const uncompressedSize = JSON.stringify(repetitiveData).length;
      
      // Native stores uncompressed
      mockNode.setPluginData('native_repetitive', JSON.stringify(repetitiveData));
      const nativeStorageUsed = mockNode.getPluginData('native_repetitive').length;
      
      // figjar compresses automatically
      figjarStorage.setPluginData('figjar_repetitive', repetitiveData);
      const figjarKeys = mockNode.getPluginDataKeys().filter(k => k.startsWith('__fpdu_'));
      let figjarStorageUsed = 0;
      for (const key of figjarKeys) {
        figjarStorageUsed += mockNode.getPluginData(key).length;
      }
      
      console.log(`  Original size: ${(uncompressedSize / 1024).toFixed(2)}KB`);
      console.log(`  Native storage: ${(nativeStorageUsed / 1024).toFixed(2)}KB`);
      console.log(`  figjar storage: ${(figjarStorageUsed / 1024).toFixed(2)}KB`);
      console.log(`  Space saved: ${(((nativeStorageUsed - figjarStorageUsed) / nativeStorageUsed) * 100).toFixed(1)}%`);
      
      // 3. Error handling
      console.log('\n3. Error Handling:');
      
      // Native API - unclear errors
      try {
        const tooLarge = generator.randomString(101 * 1024);
        mockNode.setPluginData('native_too_large', tooLarge);
      } catch (error) {
        console.log(`  Native error: "${(error as Error).message}"`);
      }
      
      // figjar - clear, specific errors
      try {
        const tooLarge = generator.generateLargeJSON(6); // 6MB
        figjarStorage.setPluginData('figjar_too_large', tooLarge);
      } catch (error) {
        console.log(`  figjar error: "${(error as Error).message}"`);
      }
    });
  });

  describe('Migration Performance', () => {
    it('should efficiently migrate from native to figjar', async () => {
      const mockNode = createMockNode();
      const figjarStorage = new PluginData(mockNode);
      
      // Setup native data
      const keysToMigrate = 20;
      for (let i = 0; i < keysToMigrate; i++) {
        const data = generator.generateSmallJSON(10);
        mockNode.setPluginData(`legacy_${i}`, JSON.stringify(data));
      }
      
      console.log('\n=== Migration Performance ===');
      console.log(`Migrating ${keysToMigrate} keys from native to figjar...`);
      
      const migrationResult = await PerformanceTimer.measureAsync(async () => {
        const result = await figjarStorage.migrateFromNative(
          Array.from({ length: keysToMigrate }, (_, i) => `legacy_${i}`)
        );
        return result;
      });
      
      console.log(`Migration time: ${migrationResult.timing.duration.toFixed(2)}ms`);
      console.log(`Migrated: ${migrationResult.result.migrated.length} keys`);
      console.log(`Failed: ${migrationResult.result.failed.length} keys`);
      console.log(`Per-key average: ${(migrationResult.timing.duration / keysToMigrate).toFixed(2)}ms`);
      
      expect(migrationResult.result.migrated.length).toBe(keysToMigrate);
      expect(migrationResult.timing.duration).toBeLessThan(keysToMigrate * 10); // < 10ms per key
    });
  });

  describe('Scalability Comparison', () => {
    it('should compare scalability limits', () => {
      console.log('\n=== Scalability Comparison ===');
      
      // Native API scalability test
      const nativeNode = createMockNode();
      let nativeKeysStored = 0;
      let nativeTotalSize = 0;
      
      try {
        // Try to store many 90KB entries
        while (nativeTotalSize < 5 * 1024 * 1024) {
          const data = generator.generateSmallJSON(90);
          nativeNode.setPluginData(`native_scale_${nativeKeysStored}`, JSON.stringify(data));
          nativeKeysStored++;
          nativeTotalSize += 90 * 1024;
        }
      } catch (error) {
        console.log(`Native API limit reached:`);
        console.log(`  Keys stored: ${nativeKeysStored}`);
        console.log(`  Total size: ${(nativeTotalSize / 1024 / 1024).toFixed(2)}MB`);
      }
      
      // figjar scalability test
      const figjarNode = createMockNode();
      const figjarStorage = new PluginData(figjarNode);
      let figjarDataSize = 0;
      
      try {
        // Store increasingly large data
        while (figjarDataSize < 5 * 1024 * 1024) {
          const sizeKB = Math.min(500, (5 * 1024) - (figjarDataSize / 1024));
          const data = generator.generateLargeJSON(sizeKB / 1024);
          figjarStorage.setPluginData(`figjar_scale_${figjarDataSize}`, data);
          figjarDataSize += sizeKB * 1024;
        }
        
        const stats = figjarStorage.getQuotaStats();
        console.log(`\nfigjar capacity:`);
        console.log(`  Used: ${(stats.used / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Available: ${(stats.available / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Utilization: ${stats.utilizationPercent.toFixed(1)}%`);
      } catch (error) {
        console.log(`figjar limit: ${(error as Error).message}`);
      }
    });
  });
});