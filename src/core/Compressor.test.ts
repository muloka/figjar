import { Compressor } from '../../src/core/Compressor';
import { CompressionError } from '../../src/utils/errors';

describe('Compressor Async API', () => {
  let compressor: Compressor;

  beforeEach(() => {
    compressor = new Compressor();
  });

  describe('Async Compression', () => {
    it('should compress and decompress data asynchronously', async () => {
      const originalData = 'Hello, World! This is test data for async compression.';
      
      const compressed = await compressor.compressAsync(originalData);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);
      
      const decompressed = await compressor.decompressAsync(compressed);
      expect(decompressed).toBe(originalData);
    });

    it('should handle large data asynchronously', async () => {
      const largeData = 'Large data chunk: '.repeat(1000);
      
      const compressed = await compressor.compressAsync(largeData);
      const decompressed = await compressor.decompressAsync(compressed);
      
      expect(decompressed).toBe(largeData);
      expect(compressed.length).toBeLessThan(largeData.length); // Should be compressed
    });

    it('should handle repetitive data efficiently asynchronously', async () => {
      const repetitiveData = 'x'.repeat(10000);
      
      const compressed = await compressor.compressAsync(repetitiveData);
      const decompressed = await compressor.decompressAsync(compressed);
      
      expect(decompressed).toBe(repetitiveData);
      expect(compressed.length).toBeLessThan(repetitiveData.length * 0.1); // Should compress very well
    });

    it('should produce same result as sync methods', async () => {
      const testData = 'Test data for sync/async comparison: ' + Math.random();
      
      const syncCompressed = compressor.compress(testData);
      const asyncCompressed = await compressor.compressAsync(testData);
      
      // Both should produce the same compressed result
      expect(asyncCompressed).toBe(syncCompressed);
      
      // Both should decompress to the same original data
      const syncDecompressed = compressor.decompress(syncCompressed);
      const asyncDecompressed = await compressor.decompressAsync(asyncCompressed);
      
      expect(syncDecompressed).toBe(testData);
      expect(asyncDecompressed).toBe(testData);
      expect(syncDecompressed).toBe(asyncDecompressed);
    });

    it('should handle cross-compatibility (sync compress, async decompress)', async () => {
      const testData = 'Cross-compatibility test data';
      
      const syncCompressed = compressor.compress(testData);
      const asyncDecompressed = await compressor.decompressAsync(syncCompressed);
      
      expect(asyncDecompressed).toBe(testData);
    });

    it('should handle cross-compatibility (async compress, sync decompress)', async () => {
      const testData = 'Reverse cross-compatibility test data';
      
      const asyncCompressed = await compressor.compressAsync(testData);
      const syncDecompressed = compressor.decompress(asyncCompressed);
      
      expect(syncDecompressed).toBe(testData);
    });

    it('should handle empty string asynchronously', async () => {
      const emptyData = '';
      
      const compressed = await compressor.compressAsync(emptyData);
      const decompressed = await compressor.decompressAsync(compressed);
      
      expect(decompressed).toBe(emptyData);
    });

    it('should handle unicode data asynchronously', async () => {
      const unicodeData = 'Hello 🌍! Café naïve résumé 你好 こんにちは 🚀✨';
      
      const compressed = await compressor.compressAsync(unicodeData);
      const decompressed = await compressor.decompressAsync(compressed);
      
      expect(decompressed).toBe(unicodeData);
    });
  });

  describe('Async Error Handling', () => {
    it('should throw CompressionError on invalid compress input', async () => {
      // Mock the gzip function to throw an error
      const originalGzip = require('fflate').gzip;
      require('fflate').gzip = (data: any, options: any, callback: any) => {
        callback(new Error('Mock compression error'));
      };
      
      await expect(compressor.compressAsync('test')).rejects.toThrow(CompressionError);
      
      // Restore original function
      require('fflate').gzip = originalGzip;
    });

    it('should throw CompressionError on invalid decompress input', async () => {
      const invalidData = 'invalid-base64-data-that-cannot-be-decompressed!@#$%';
      
      await expect(compressor.decompressAsync(invalidData)).rejects.toThrow(CompressionError);
    });

    it('should handle corrupted compressed data gracefully', async () => {
      // Use clearly invalid base64 data that will fail decompression
      const corruptedData = 'definitely-not-valid-compressed-data!@#$%^&*()';
      
      await expect(compressor.decompressAsync(corruptedData)).rejects.toThrow(CompressionError);
    });
  });

  describe('Performance Comparison', () => {
    it('should complete async operations in reasonable time', async () => {
      const testData = 'Performance test data: '.repeat(1000);
      
      // Test async compression timing
      const compressStart = Date.now();
      const compressed = await compressor.compressAsync(testData);
      const compressTime = Date.now() - compressStart;
      
      // Test async decompression timing
      const decompressStart = Date.now();
      const decompressed = await compressor.decompressAsync(compressed);
      const decompressTime = Date.now() - decompressStart;
      
      expect(decompressed).toBe(testData);
      expect(compressTime).toBeLessThan(1000); // Should complete within 1 second
      expect(decompressTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});