import { Compressor } from '../../src/core/Compressor';
import { CompressionError } from '../../src/utils/errors';

describe('Compressor - Large Data Handling', () => {
  let compressor: Compressor;

  beforeEach(() => {
    compressor = new Compressor();
  });

  describe('Large Data Compression', () => {
    it('should handle compression of 1MB+ data without errors', () => {
      const largeData = 'x'.repeat(1024 * 1024); // 1MB
      
      // This should not throw
      const compressed = compressor.compress(largeData);
      const decompressed = compressor.decompress(compressed);
      
      expect(decompressed).toBe(largeData);
    });

    it('should handle compression of 5MB data', () => {
      const veryLargeData = 'Hello World! '.repeat(400000); // ~5MB
      
      const compressed = compressor.compress(veryLargeData);
      const decompressed = compressor.decompress(compressed);
      
      expect(decompressed).toBe(veryLargeData);
    });

    it('should handle data with maximum compressed size', () => {
      // Create data that compresses poorly (random-like)
      const data = Array(1024 * 1024).fill(null)
        .map(() => String.fromCharCode(Math.floor(Math.random() * 128)))
        .join('');
      
      const compressed = compressor.compress(data);
      const decompressed = compressor.decompress(compressed);
      
      expect(decompressed).toBe(data);
    });
  });

  describe('Base64 Conversion Edge Cases', () => {
    it('should handle empty data', () => {
      const emptyData = '';
      
      const compressed = compressor.compress(emptyData);
      const decompressed = compressor.decompress(compressed);
      
      expect(decompressed).toBe(emptyData);
    });

    it('should handle data with special characters', () => {
      const specialData = '🎉'.repeat(10000) + '测试'.repeat(10000) + '\n\t\r'.repeat(10000);
      
      const compressed = compressor.compress(specialData);
      const decompressed = compressor.decompress(compressed);
      
      expect(decompressed).toBe(specialData);
    });

    it('should handle data that results in large compressed output', () => {
      // Create highly compressible data that will still be large after compression
      const pattern = JSON.stringify({ 
        data: Array(1000).fill({ 
          type: 'component', 
          props: { color: 'blue', size: 'large' } 
        }) 
      });
      const largeCompressibleData = pattern.repeat(100);
      
      const compressed = compressor.compress(largeCompressibleData);
      const decompressed = compressor.decompress(compressed);
      
      expect(decompressed).toBe(largeCompressibleData);
    });
  });

  describe('Performance Characteristics', () => {
    it('should compress large data within reasonable time', () => {
      const data = 'x'.repeat(1024 * 1024); // 1MB
      
      const start = performance.now();
      compressor.compress(data);
      const duration = performance.now() - start;
      
      // Should complete in less than 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should maintain consistent compression ratios', () => {
      const jsonData = JSON.stringify({
        users: Array(100).fill(null).map((_, i) => ({
          id: `user_${i}`,
          name: `User ${i}`,
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: { email: true, push: false }
          }
        }))
      });
      
      const compressed = compressor.compress(jsonData);
      const ratio = (1 - compressed.length / jsonData.length) * 100;
      
      // Should achieve at least 50% compression for repetitive JSON
      expect(ratio).toBeGreaterThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should throw CompressionError for invalid input to decompress', () => {
      expect(() => {
        compressor.decompress('not-valid-base64!!!');
      }).toThrow(CompressionError);
    });

    it('should handle corrupted compressed data gracefully', () => {
      // Create invalid base64 that will fail during decompression
      const invalidCompressed = 'H4sIAAAAAAAA/corrupted_data_here';
      
      expect(() => {
        compressor.decompress(invalidCompressed);
      }).toThrow(CompressionError);
    });
  });
});