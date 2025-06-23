import { ChunkManager } from './ChunkManager';
import { EntryTooLargeError } from '../utils/errors';

describe('ChunkManager', () => {
  let chunkManager: ChunkManager;

  beforeEach(() => {
    chunkManager = new ChunkManager();
  });

  describe('chunk()', () => {
    it('should handle empty string', () => {
      const result = chunkManager.chunk('');
      expect(result.chunks).toEqual([]);
      expect(result.totalSize).toBe(0);
    });

    it('should handle small data (under chunk size)', () => {
      const data = 'Hello, World!';
      const result = chunkManager.chunk(data);
      expect(result.chunks).toEqual([data]);
      expect(result.totalSize).toBe(data.length);
    });

    it('should handle data exactly at chunk size', () => {
      const chunkSize = 85 * 1024; // 85KB
      const data = 'x'.repeat(chunkSize);
      const result = chunkManager.chunk(data);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]).toBe(data);
      expect(result.totalSize).toBe(chunkSize);
    });

    it('should split large data into multiple chunks', () => {
      const chunkSize = 85 * 1024; // 85KB
      const data = 'x'.repeat(chunkSize * 2 + 1000); // 2+ chunks
      const result = chunkManager.chunk(data);
      
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0]).toHaveLength(chunkSize);
      expect(result.chunks[1]).toHaveLength(chunkSize);
      expect(result.chunks[2]).toHaveLength(1000);
      expect(result.totalSize).toBe(data.length);
    });

    it('should handle Unicode characters correctly', () => {
      const unicodeData = '🎉'.repeat(1000) + '你好世界'.repeat(500);
      const result = chunkManager.chunk(unicodeData);
      
      // Verify total size matches original
      expect(result.totalSize).toBe(unicodeData.length);
      
      // Verify chunks can be rejoined to original
      const rejoined = result.chunks.join('');
      expect(rejoined).toBe(unicodeData);
    });

    it('should handle very large data (>1MB)', () => {
      const largeData = 'A'.repeat(1024 * 1024 + 5000); // ~1MB + 5KB
      const result = chunkManager.chunk(largeData);
      
      expect(result.chunks.length).toBeGreaterThan(10); // Should split into many chunks
      expect(result.totalSize).toBe(largeData.length);
      
      // Verify chunks can be rejoined
      const rejoined = result.chunks.join('');
      expect(rejoined).toBe(largeData);
    });
  });

  describe('calculateChunkKey()', () => {
    it('should generate correct key format', () => {
      const key = chunkManager.calculateChunkKey('testKey', 0);
      expect(key).toBe('__fpdu_chunk_testKey_0');
    });

    it('should handle different base keys', () => {
      expect(chunkManager.calculateChunkKey('userData', 5))
        .toBe('__fpdu_chunk_userData_5');
      expect(chunkManager.calculateChunkKey('config', 99))
        .toBe('__fpdu_chunk_config_99');
    });

    it('should handle special characters in base key', () => {
      const key = chunkManager.calculateChunkKey('user-data_123', 0);
      expect(key).toBe('__fpdu_chunk_user-data_123_0');
    });

    it('should handle large index numbers', () => {
      const key = chunkManager.calculateChunkKey('test', 999);
      expect(key).toBe('__fpdu_chunk_test_999');
    });
  });

  describe('validateChunkEntry()', () => {
    it('should pass for valid chunk sizes', () => {
      const key = '__fpdu_chunk_test_0';
      const chunk = 'x'.repeat(90 * 1024); // 90KB chunk
      
      expect(() => {
        chunkManager.validateChunkEntry(key, chunk);
      }).not.toThrow();
    });

    it('should pass for chunk exactly at limit', () => {
      const key = '__fpdu_chunk_test_0';
      const maxEntrySize = chunkManager.getMaxEntrySize();
      const chunk = 'x'.repeat(maxEntrySize - key.length);
      
      expect(() => {
        chunkManager.validateChunkEntry(key, chunk);
      }).not.toThrow();
    });

    it('should throw EntryTooLargeError for oversized chunks', () => {
      const key = '__fpdu_chunk_test_0';
      const maxEntrySize = chunkManager.getMaxEntrySize();
      const chunk = 'x'.repeat(maxEntrySize); // Chunk + key will exceed limit
      
      expect(() => {
        chunkManager.validateChunkEntry(key, chunk);
      }).toThrow(EntryTooLargeError);
    });

    it('should throw EntryTooLargeError with descriptive message', () => {
      const key = '__fpdu_chunk_test_0';
      const chunk = 'x'.repeat(200 * 1024); // Way too large
      
      try {
        chunkManager.validateChunkEntry(key, chunk);
        fail('Expected EntryTooLargeError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EntryTooLargeError);
        const entryError = error as EntryTooLargeError;
        expect(entryError.message).toContain('KB exceeds');
        expect(entryError.message).toContain('KB limit');
      }
    });
  });

  describe('getSafeChunkSize()', () => {
    it('should return size accounting for key overhead', () => {
      const baseKey = 'testData';
      const safeSize = chunkManager.getSafeChunkSize(baseKey);
      const maxEntrySize = chunkManager.getMaxEntrySize();
      
      // Should be less than max entry size
      expect(safeSize).toBeLessThan(maxEntrySize);
      
      // Should account for longest possible key
      const longestKey = chunkManager.calculateChunkKey(baseKey, 999);
      expect(safeSize).toBe(maxEntrySize - longestKey.length);
    });

    it('should work with different base key lengths', () => {
      const shortKey = 'a';
      const longKey = 'veryLongBaseKeyName';
      
      const shortSafeSize = chunkManager.getSafeChunkSize(shortKey);
      const longSafeSize = chunkManager.getSafeChunkSize(longKey);
      
      // Longer base key should result in smaller safe chunk size
      expect(longSafeSize).toBeLessThan(shortSafeSize);
    });
  });

  describe('getMaxEntrySize()', () => {
    it('should return the correct max entry size', () => {
      expect(chunkManager.getMaxEntrySize()).toBe(100 * 1024); // 100KB
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical usage pattern', () => {
      const baseKey = 'userSettings';
      const largeData = JSON.stringify({
        theme: 'dark',
        settings: 'x'.repeat(200 * 1024) // 200KB of data
      });
      
      // Chunk the data
      const result = chunkManager.chunk(largeData);
      expect(result.chunks.length).toBeGreaterThan(1);
      
      // Validate each chunk with its key
      result.chunks.forEach((chunk, index) => {
        const key = chunkManager.calculateChunkKey(baseKey, index);
        expect(() => {
          chunkManager.validateChunkEntry(key, chunk);
        }).not.toThrow();
      });
      
      // Verify data integrity
      const rejoined = result.chunks.join('');
      expect(rejoined).toBe(largeData);
    });

    it('should respect safe chunk size limits', () => {
      const baseKey = 'testKey';
      const safeSize = chunkManager.getSafeChunkSize(baseKey);
      const data = 'x'.repeat(safeSize);
      
      // Note: ChunkManager uses fixed CHUNK_SIZE (85KB), not safe size for chunking
      // So we test that safe size data fits in one validation, not one chunk
      const result = chunkManager.chunk(data);
      
      // Each chunk should validate successfully with its key
      result.chunks.forEach((chunk, index) => {
        const key = chunkManager.calculateChunkKey(baseKey, index);
        expect(() => {
          chunkManager.validateChunkEntry(key, chunk);
        }).not.toThrow();
      });
    });
  });
});