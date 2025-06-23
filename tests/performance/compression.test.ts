import { Compressor } from '../../src/core/Compressor';
import { DataGenerator } from './utils/data-generators';
import { PerformanceTimer } from './utils/timer';

describe('Compression Performance', () => {
  let compressor: Compressor;
  let generator: DataGenerator;
  
  beforeEach(() => {
    compressor = new Compressor();
    generator = new DataGenerator({ seed: 12345 });
  });

  describe('Compression Ratios', () => {
    it('should achieve 60%+ compression on typical JSON data', () => {
      const testData = [
        { name: 'settings', data: generator.generatePluginData('settings') },
        { name: 'components', data: generator.generatePluginData('components') },
        { name: 'tokens', data: generator.generatePluginData('tokens') },
        { name: 'state', data: generator.generatePluginData('state') }
      ];
      
      console.log('\n=== JSON Compression Ratios ===');
      
      for (const { name, data } of testData) {
        const original = JSON.stringify(data);
        const compressed = compressor.compress(original);
        
        const originalSize = original.length;
        const compressedSize = compressed.length;
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;
        
        console.log(`${name}:`);
        console.log(`  Original:    ${(originalSize / 1024).toFixed(2)}KB`);
        console.log(`  Compressed:  ${(compressedSize / 1024).toFixed(2)}KB`);
        console.log(`  Ratio:       ${ratio.toFixed(1)}%`);
        
        expect(ratio).toBeGreaterThan(60);
      }
    });

    it('should achieve 80%+ compression on repetitive data', () => {
      const sizes = [10, 50, 100, 500]; // KB
      
      console.log('\n=== Repetitive Data Compression ===');
      
      for (const sizeKB of sizes) {
        const data = generator.generateRepetitiveData(sizeKB);
        const original = JSON.stringify(data);
        const compressed = compressor.compress(original);
        
        const originalSize = original.length;
        const compressedSize = compressed.length;
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;
        
        console.log(`${sizeKB}KB repetitive data:`);
        console.log(`  Original:    ${(originalSize / 1024).toFixed(2)}KB`);
        console.log(`  Compressed:  ${(compressedSize / 1024).toFixed(2)}KB`);
        console.log(`  Ratio:       ${ratio.toFixed(1)}%`);
        
        expect(ratio).toBeGreaterThan(80);
      }
    });

    it('should handle low-compressibility data gracefully', () => {
      const sizes = [10, 50, 100]; // KB
      
      console.log('\n=== Random Data Compression ===');
      
      for (const sizeKB of sizes) {
        const data = generator.generateRandomData(sizeKB);
        const original = JSON.stringify(data);
        const compressed = compressor.compress(original);
        
        const originalSize = original.length;
        const compressedSize = compressed.length;
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;
        
        console.log(`${sizeKB}KB random data:`);
        console.log(`  Original:    ${(originalSize / 1024).toFixed(2)}KB`);
        console.log(`  Compressed:  ${(compressedSize / 1024).toFixed(2)}KB`);
        console.log(`  Ratio:       ${ratio.toFixed(1)}%`);
        
        // Random data might expand slightly due to encoding overhead
        expect(compressedSize).toBeLessThan(originalSize * 1.1);
      }
    });

    it('should measure compression effectiveness across data types', () => {
      const testCases = [
        { type: 'best' as const, expectedRatio: 80 },
        { type: 'average' as const, expectedRatio: 60 },
        { type: 'worst' as const, expectedRatio: -10 } // Might expand
      ];
      
      console.log('\n=== Compression by Data Type ===');
      
      for (const { type, expectedRatio } of testCases) {
        const data = generator.generateCompressionTestData(type, 100);
        const original = JSON.stringify(data);
        const compressed = compressor.compress(original);
        
        const originalSize = original.length;
        const compressedSize = compressed.length;
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;
        
        console.log(`${type} case:`);
        console.log(`  Original:    ${(originalSize / 1024).toFixed(2)}KB`);
        console.log(`  Compressed:  ${(compressedSize / 1024).toFixed(2)}KB`);
        console.log(`  Ratio:       ${ratio.toFixed(1)}%`);
        console.log(`  Expected:    >${expectedRatio}%`);
        
        expect(ratio).toBeGreaterThan(expectedRatio);
      }
    });
  });

  describe('Compression Performance', () => {
    it('should compress data quickly', () => {
      const sizes = [1, 10, 50, 100, 500, 1000]; // KB
      
      console.log('\n=== Compression Speed ===');
      
      for (const sizeKB of sizes) {
        const data = sizeKB < 100 
          ? generator.generateSmallJSON(sizeKB)
          : generator.generateLargeJSON(sizeKB / 1024);
        const jsonString = JSON.stringify(data);
        
        const compressionResult = PerformanceTimer.benchmark(() => {
          compressor.compress(jsonString);
        }, { iterations: 20, warmup: 5 });
        
        console.log(`${sizeKB}KB compression:`);
        console.log(`  Median: ${compressionResult.median.toFixed(2)}ms`);
        console.log(`  P95:    ${compressionResult.p95.toFixed(2)}ms`);
        
        // Compression should be fast
        if (sizeKB < 100) {
          expect(compressionResult.median).toBeLessThan(10);
        } else {
          expect(compressionResult.median).toBeLessThan(50);
        }
      }
    });

    it('should decompress data quickly', () => {
      const sizes = [1, 10, 50, 100, 500, 1000]; // KB
      
      console.log('\n=== Decompression Speed ===');
      
      for (const sizeKB of sizes) {
        const data = sizeKB < 100 
          ? generator.generateSmallJSON(sizeKB)
          : generator.generateLargeJSON(sizeKB / 1024);
        const jsonString = JSON.stringify(data);
        const compressed = compressor.compress(jsonString);
        
        const decompressionResult = PerformanceTimer.benchmark(() => {
          compressor.decompress(compressed);
        }, { iterations: 20, warmup: 5 });
        
        console.log(`${sizeKB}KB decompression:`);
        console.log(`  Median: ${decompressionResult.median.toFixed(2)}ms`);
        console.log(`  P95:    ${decompressionResult.p95.toFixed(2)}ms`);
        
        // Decompression should be fast
        if (sizeKB < 100) {
          expect(decompressionResult.median).toBeLessThan(10);
        } else {
          expect(decompressionResult.median).toBeLessThan(50);
        }
      }
    });
  });

  describe('Compression Overhead Analysis', () => {
    it('should measure compression overhead as percentage of total operation time', () => {
      const testSizes = [10, 50, 100]; // KB
      
      console.log('\n=== Compression Overhead ===');
      
      for (const sizeKB of testSizes) {
        const data = generator.generateSmallJSON(sizeKB);
        const jsonString = JSON.stringify(data);
        
        // Measure serialization time
        const serializationResult = PerformanceTimer.benchmark(() => {
          JSON.stringify(data);
        }, { iterations: 50, warmup: 10 });
        
        // Measure compression time
        const compressionResult = PerformanceTimer.benchmark(() => {
          compressor.compress(jsonString);
        }, { iterations: 50, warmup: 10 });
        
        // Measure total operation time (serialize + compress)
        const totalResult = PerformanceTimer.benchmark(() => {
          const str = JSON.stringify(data);
          compressor.compress(str);
        }, { iterations: 50, warmup: 10 });
        
        const compressionOverhead = (compressionResult.median / totalResult.median) * 100;
        
        console.log(`${sizeKB}KB data:`);
        console.log(`  Serialization: ${serializationResult.median.toFixed(2)}ms`);
        console.log(`  Compression:   ${compressionResult.median.toFixed(2)}ms`);
        console.log(`  Total:         ${totalResult.median.toFixed(2)}ms`);
        console.log(`  Compression overhead: ${compressionOverhead.toFixed(1)}%`);
        
        // Compression overhead should be reasonable (for small data, compression dominates)
        expect(compressionOverhead).toBeLessThan(100); // Allow high overhead for small data
      }
    });
  });

  describe('Base64 Encoding Impact', () => {
    it('should measure base64 encoding overhead', () => {
      const sizes = [10, 50, 100]; // KB
      
      console.log('\n=== Base64 Encoding Overhead ===');
      
      for (const sizeKB of sizes) {
        const data = generator.generateSmallJSON(sizeKB);
        const jsonString = JSON.stringify(data);
        const compressed = compressor.compress(jsonString);
        
        // Base64 encoding increases size by ~33%
        const compressedBytes = atob(compressed).length;
        const base64Bytes = compressed.length;
        const overhead = ((base64Bytes - compressedBytes) / compressedBytes) * 100;
        
        console.log(`${sizeKB}KB data:`);
        console.log(`  Compressed (raw):    ${(compressedBytes / 1024).toFixed(2)}KB`);
        console.log(`  Compressed (base64): ${(base64Bytes / 1024).toFixed(2)}KB`);
        console.log(`  Base64 overhead:     ${overhead.toFixed(1)}%`);
        
        // Base64 overhead should be around 33%
        expect(overhead).toBeGreaterThan(30);
        expect(overhead).toBeLessThan(40);
      }
    });
  });
});