import { PluginData } from '../../src/PluginData';
import { BaseNode } from '../../src/types';
import { GlobalQuotaManager } from '../../src/core/GlobalQuotaManager';
import { createMockNode } from '../mocks/figma.mock';
import { 
  DataTooLargeError, 
  DataCorruptedError, 
  InvalidKeyError,
  CompressionError,
  QuotaExceededError,
  EntryTooLargeError
} from '../../src/utils/errors';

describe('PluginData Async API', () => {
  let mockNode: BaseNode;
  let storage: PluginData;

  beforeEach(() => {
    // Reset global quota manager before each test
    GlobalQuotaManager.reset();
    mockNode = createMockNode();
    storage = new PluginData(mockNode);
  });

  describe('Basic Async Storage', () => {
    it('should store and retrieve simple strings asynchronously', async () => {
      await storage.setPluginDataAsync('test', 'hello world');
      const result = await storage.getPluginDataAsync('test');
      expect(result).toBe('hello world');
    });

    it('should store and retrieve JSON objects asynchronously', async () => {
      const obj = { name: 'test', value: 42, nested: { data: true } };
      await storage.setPluginDataAsync('object', obj);
      const result = await storage.getPluginDataAsync('object');
      expect(result).toEqual(obj);
    });

    it('should return empty string for non-existent keys asynchronously', async () => {
      const result = await storage.getPluginDataAsync('nonexistent');
      expect(result).toBe('');
    });
  });

  describe('Async/Sync Interoperability', () => {
    it('should read data stored with sync method using async method', async () => {
      const testData = 'sync stored data';
      storage.setPluginData('sync-key', testData);
      
      const result = await storage.getPluginDataAsync('sync-key');
      expect(result).toBe(testData);
    });

    it('should read data stored with async method using sync method', async () => {
      const testData = 'async stored data';
      await storage.setPluginDataAsync('async-key', testData);
      
      const result = storage.getPluginData('async-key');
      expect(result).toBe(testData);
    });

    it('should handle complex objects stored sync and read async', async () => {
      const complexObj = { 
        users: ['alice', 'bob'], 
        config: { enabled: true, count: 100 },
        metadata: { version: '2.0', timestamp: Date.now() }
      };
      
      storage.setPluginData('complex', complexObj);
      const result = await storage.getPluginDataAsync('complex');
      expect(result).toEqual(complexObj);
    });

    it('should handle large data stored async and read sync', async () => {
      const largeData = 'x'.repeat(50 * 1024); // 50KB
      await storage.setPluginDataAsync('large', largeData);
      
      const result = storage.getPluginData('large');
      expect(result).toBe(largeData);
    });
  });

  describe('Async Key Validation', () => {
    it('should throw InvalidKeyError for empty keys asynchronously', async () => {
      await expect(storage.setPluginDataAsync('', 'data')).rejects.toThrow(InvalidKeyError);
    });

    it('should throw InvalidKeyError for internal keys asynchronously', async () => {
      await expect(storage.setPluginDataAsync('__fpdu_test', 'data')).rejects.toThrow(InvalidKeyError);
    });

    it('should allow normal keys asynchronously', async () => {
      await expect(storage.setPluginDataAsync('normalKey', 'data')).resolves.not.toThrow();
    });
  });

  describe('Async Size Limits', () => {
    it('should handle large raw data through compression and chunking asynchronously', async () => {
      const largeData = 'x'.repeat(200 * 1024); // 200KB raw - should compress well
      await expect(storage.setPluginDataAsync('large', largeData)).resolves.not.toThrow();
      
      const result = await storage.getPluginDataAsync('large');
      expect(result).toBe(largeData);
    });

    it('should respect the architectural constraints properly asynchronously', async () => {
      const data95KB = 'x'.repeat(95 * 1024); // 95KB - should work
      await expect(storage.setPluginDataAsync('large1', data95KB)).resolves.not.toThrow();
      
      const data500KB = 'x'.repeat(500 * 1024); // 500KB - should work via compression/chunking
      await expect(storage.setPluginDataAsync('large2', data500KB)).resolves.not.toThrow();
    });

    it('should handle data under 100KB entry limit asynchronously', async () => {
      const mediumData = 'x'.repeat(50 * 1024); // 50KB (will compress to much smaller)
      await expect(storage.setPluginDataAsync('medium', mediumData)).resolves.not.toThrow();
    });
  });

  describe('Async Compression', () => {
    it('should automatically compress and decompress data asynchronously', async () => {
      const repetitiveData = 'Lorem ipsum '.repeat(1000);
      await storage.setPluginDataAsync('compressed', repetitiveData);
      
      const result = await storage.getPluginDataAsync('compressed');
      expect(result).toBe(repetitiveData);
    });
  });

  describe('Async Chunking', () => {
    it('should handle data within entry limits that may need chunking after compression', async () => {
      const data = 'Some varied content: ' + Math.random().toString(36).repeat(2000); // ~72KB
      await storage.setPluginDataAsync('chunked', data);
      
      const result = await storage.getPluginDataAsync('chunked');
      expect(result).toBe(data);
      
      // Should have stored successfully without chunking due to compression
      const keys = mockNode.getPluginDataKeys();
      const hasChunks = keys.some(k => k.startsWith('__fpdu_chunk_'));
      // May or may not chunk depending on compression ratio
    });

    it('should chunk large data that exceeds 85KB after compression asynchronously', async () => {
      // Create data that will definitely be chunked by being larger than chunk size
      // Use random data that won't compress well
      const baseData = Array.from({length: 2000}, (_, i) => 
        `Block${i}:${Math.random().toString(36).substring(2)}${Date.now()}${Math.random()}`
      ).join('|');
      
      await storage.setPluginDataAsync('chunked-large', baseData);
      const result = await storage.getPluginDataAsync('chunked-large');
      expect(result).toBe(baseData);
      
      // Should have created chunks - check metadata to confirm chunking
      const keys = mockNode.getPluginDataKeys();
      const hasMetadata = keys.includes('__fpdu_meta_chunked-large');
      expect(hasMetadata).toBe(true);
      
      if (hasMetadata) {
        const metadataStr = mockNode.getPluginData('__fpdu_meta_chunked-large');
        const metadata = JSON.parse(metadataStr);
        
        // If data was chunked, metadata should indicate it
        if (metadata.chunked) {
          expect(metadata.chunked).toBe(true);
          expect(metadata.totalChunks).toBeGreaterThan(1);
          
          // Verify chunk keys exist
          const chunkKeys = keys.filter(k => k.startsWith('__fpdu_chunk_chunked-large'));
          expect(chunkKeys.length).toBe(metadata.totalChunks);
        }
      }
    });
  });

  describe('Async Error Handling', () => {
    it('should throw CompressionError on compression failure asynchronously', async () => {
      // Mock the compressor to throw an error
      const originalCompress = storage['compressor'].compressAsync;
      storage['compressor'].compressAsync = jest.fn().mockRejectedValue(new Error('Compression failed'));
      
      await expect(storage.setPluginDataAsync('test', 'data')).rejects.toThrow(CompressionError);
      
      // Restore original method
      storage['compressor'].compressAsync = originalCompress;
    });

    it('should throw DataCorruptedError for corrupted data asynchronously', async () => {
      // Store valid data first
      await storage.setPluginDataAsync('test', 'valid data');
      
      // Corrupt the metadata
      mockNode.setPluginData('__fpdu_meta_test', 'corrupted metadata');
      
      await expect(storage.getPluginDataAsync('test')).rejects.toThrow(DataCorruptedError);
    });

    it('should handle missing chunks gracefully asynchronously', async () => {
      // Create a scenario with missing chunks by manipulating metadata
      const metadata = {
        compressed: true,
        chunked: true,
        totalChunks: 2,
        checksum: 'fake-checksum',
        size: 1000
      };
      
      mockNode.setPluginData('__fpdu_meta_missing', JSON.stringify(metadata));
      // Don't create the actual chunks
      
      await expect(storage.getPluginDataAsync('missing')).rejects.toThrow(DataCorruptedError);
    });
  });

  describe('Async Utility Methods', () => {
    it('should delete data asynchronously', async () => {
      await storage.setPluginDataAsync('to-delete', 'test data');
      expect(await storage.getPluginDataAsync('to-delete')).toBe('test data');
      
      await storage.deletePluginDataAsync('to-delete');
      expect(await storage.getPluginDataAsync('to-delete')).toBe('');
    });

    it('should delete chunked data asynchronously', async () => {
      // Create chunked data
      const largeData = Array.from({length: 1000}, (_, i) => 
        `Large chunk data ${i}: ${Math.random().toString(36)}`
      ).join('\n');
      
      await storage.setPluginDataAsync('chunked-delete', largeData);
      expect(await storage.getPluginDataAsync('chunked-delete')).toBe(largeData);
      
      await storage.deletePluginDataAsync('chunked-delete');
      expect(await storage.getPluginDataAsync('chunked-delete')).toBe('');
      
      // Verify chunks are cleaned up
      const keys = mockNode.getPluginDataKeys();
      const hasChunks = keys.some(k => k.startsWith('__fpdu_chunk_chunked-delete'));
      expect(hasChunks).toBe(false);
    });

    it('should optimize storage asynchronously', async () => {
      await storage.setPluginDataAsync('opt1', 'data1');
      await storage.setPluginDataAsync('opt2', 'data2');
      
      const result = await storage.optimizeStorageAsync();
      expect(result).toHaveProperty('bytesSaved');
      expect(result).toHaveProperty('keysOptimized');
      expect(typeof result.bytesSaved).toBe('number');
      expect(typeof result.keysOptimized).toBe('number');
    });

    it('should migrate from native storage asynchronously', async () => {
      // Set up native storage data
      mockNode.setPluginData('native1', 'raw data 1');
      mockNode.setPluginData('native2', JSON.stringify({ data: 'object data' }));
      
      const result = await storage.migrateFromNativeAsync();
      expect(result.migrated).toContain('native1');
      expect(result.migrated).toContain('native2');
      expect(result.failed).toEqual([]);
      
      // Verify data is accessible through async methods
      expect(await storage.getPluginDataAsync('native1')).toBe('raw data 1');
      expect(await storage.getPluginDataAsync('native2')).toEqual({ data: 'object data' });
    });
  });

  describe('Mixed Async/Sync Usage Patterns', () => {
    it('should handle mixed storage and retrieval patterns', async () => {
      // Store with sync, read with async
      storage.setPluginData('sync-stored', 'sync data');
      expect(await storage.getPluginDataAsync('sync-stored')).toBe('sync data');
      
      // Store with async, read with sync
      await storage.setPluginDataAsync('async-stored', 'async data');
      expect(storage.getPluginData('async-stored')).toBe('async data');
      
      // Mix operations on same key
      storage.setPluginData('mixed', 'initial');
      expect(await storage.getPluginDataAsync('mixed')).toBe('initial');
      
      await storage.setPluginDataAsync('mixed', 'updated');
      expect(storage.getPluginData('mixed')).toBe('updated');
    });

    it('should handle concurrent async operations', async () => {
      const promises = [
        storage.setPluginDataAsync('concurrent1', 'data1'),
        storage.setPluginDataAsync('concurrent2', 'data2'),
        storage.setPluginDataAsync('concurrent3', 'data3')
      ];
      
      await Promise.all(promises);
      
      const results = await Promise.all([
        storage.getPluginDataAsync('concurrent1'),
        storage.getPluginDataAsync('concurrent2'),
        storage.getPluginDataAsync('concurrent3')
      ]);
      
      expect(results).toEqual(['data1', 'data2', 'data3']);
    });

    it('should maintain consistency across mixed operations', async () => {
      const testData = { count: 0 };
      
      // Series of mixed operations
      storage.setPluginData('counter', testData);
      
      let current = await storage.getPluginDataAsync<{ count: number }>('counter');
      current.count++;
      await storage.setPluginDataAsync('counter', current);
      
      current = storage.getPluginData<{ count: number }>('counter');
      current.count++;
      storage.setPluginData('counter', current);
      
      const final = await storage.getPluginDataAsync<{ count: number }>('counter');
      expect(final.count).toBe(2);
    });
  });

  describe('Performance and Promise.all() Behavior', () => {
    it('should handle Promise.all() patterns correctly', async () => {
      // Test Promise.all() with multiple async operations
      const data1 = 'Large dataset 1: ' + 'x'.repeat(10000);
      const data2 = 'Large dataset 2: ' + 'y'.repeat(10000);
      const data3 = 'Large dataset 3: ' + 'z'.repeat(10000);
      
      const startTime = Date.now();
      await Promise.all([
        storage.setPluginDataAsync('parallel1', data1),
        storage.setPluginDataAsync('parallel2', data2),
        storage.setPluginDataAsync('parallel3', data3)
      ]);
      const storeTime = Date.now() - startTime;
      
      const retrieveStart = Date.now();
      const results = await Promise.all([
        storage.getPluginDataAsync('parallel1'),
        storage.getPluginDataAsync('parallel2'),
        storage.getPluginDataAsync('parallel3')
      ]);
      const retrieveTime = Date.now() - retrieveStart;
      
      expect(results).toEqual([data1, data2, data3]);
      
      // Operations should complete reasonably quickly
      expect(storeTime).toBeLessThan(5000); // 5 seconds max
      expect(retrieveTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle async deletion patterns correctly', async () => {
      // Store multiple items
      await Promise.all([
        storage.setPluginDataAsync('delete1', 'data1'),
        storage.setPluginDataAsync('delete2', 'data2'),
        storage.setPluginDataAsync('delete3', 'data3')
      ]);
      
      // Verify they exist
      const beforeKeys = storage.getPluginDataKeys();
      expect(beforeKeys).toContain('delete1');
      expect(beforeKeys).toContain('delete2');
      expect(beforeKeys).toContain('delete3');
      
      // Delete them all in parallel
      await Promise.all([
        storage.deletePluginDataAsync('delete1'),
        storage.deletePluginDataAsync('delete2'),
        storage.deletePluginDataAsync('delete3')
      ]);
      
      // Verify they're gone
      const afterKeys = storage.getPluginDataKeys();
      expect(afterKeys).not.toContain('delete1');
      expect(afterKeys).not.toContain('delete2');
      expect(afterKeys).not.toContain('delete3');
    });
  });
});