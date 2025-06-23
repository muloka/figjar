import { IntegrityValidator } from './IntegrityValidator';

describe('IntegrityValidator', () => {
  let validator: IntegrityValidator;

  beforeEach(() => {
    validator = new IntegrityValidator();
  });

  describe('calculateChecksum()', () => {
    it('should generate consistent checksums for the same input', () => {
      const data = 'Hello, World!';
      const checksum1 = validator.calculateChecksum(data);
      const checksum2 = validator.calculateChecksum(data);
      
      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
      expect(checksum1.length).toBeGreaterThan(0);
    });

    it('should generate different checksums for different inputs', () => {
      const data1 = 'Hello, World!';
      const data2 = 'Hello, World?';
      const data3 = 'Goodbye, World!';
      
      const checksum1 = validator.calculateChecksum(data1);
      const checksum2 = validator.calculateChecksum(data2);
      const checksum3 = validator.calculateChecksum(data3);
      
      expect(checksum1).not.toBe(checksum2);
      expect(checksum1).not.toBe(checksum3);
      expect(checksum2).not.toBe(checksum3);
    });

    it('should handle empty string', () => {
      const checksum = validator.calculateChecksum('');
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
      
      // Should be consistent
      expect(validator.calculateChecksum('')).toBe(checksum);
    });

    it('should handle very long strings', () => {
      const longData = 'x'.repeat(1024 * 1024); // 1MB of data
      const checksum = validator.calculateChecksum(longData);
      
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
      
      // Should be consistent
      expect(validator.calculateChecksum(longData)).toBe(checksum);
    });

    it('should handle Unicode characters correctly', () => {
      const unicodeData = '🎉🚀💯 Hello 你好 こんにちは мир';
      const checksum = validator.calculateChecksum(unicodeData);
      
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
      
      // Should be consistent
      expect(validator.calculateChecksum(unicodeData)).toBe(checksum);
    });

    it('should be sensitive to character order', () => {
      const data1 = 'abc';
      const data2 = 'bac';
      const data3 = 'cab';
      
      const checksum1 = validator.calculateChecksum(data1);
      const checksum2 = validator.calculateChecksum(data2);
      const checksum3 = validator.calculateChecksum(data3);
      
      expect(checksum1).not.toBe(checksum2);
      expect(checksum1).not.toBe(checksum3);
      expect(checksum2).not.toBe(checksum3);
    });

    it('should be sensitive to case differences', () => {
      const lowercase = 'hello world';
      const uppercase = 'HELLO WORLD';
      const mixed = 'Hello World';
      
      const checksum1 = validator.calculateChecksum(lowercase);
      const checksum2 = validator.calculateChecksum(uppercase);
      const checksum3 = validator.calculateChecksum(mixed);
      
      expect(checksum1).not.toBe(checksum2);
      expect(checksum1).not.toBe(checksum3);
      expect(checksum2).not.toBe(checksum3);
    });

    it('should produce readable base36 output', () => {
      const data = 'Test data for checksum';
      const checksum = validator.calculateChecksum(data);
      
      // Should only contain valid base36 characters (0-9, a-z)
      expect(checksum).toMatch(/^[0-9a-z]+$/);
      
      // Should be reasonably short but distinctive
      expect(checksum.length).toBeLessThan(20);
      expect(checksum.length).toBeGreaterThan(3);
    });

    it('should handle special characters and whitespace', () => {
      const specialData = '  \t\n\r!@#$%^&*()[]{}|\\:";\'<>?,./ ';
      const checksum = validator.calculateChecksum(specialData);
      
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
      
      // Should be consistent
      expect(validator.calculateChecksum(specialData)).toBe(checksum);
    });

    it('should detect subtle data differences', () => {
      const data1 = 'The quick brown fox jumps over the lazy dog';
      const data2 = 'The quick brown fox jumps over the lazy dog.'; // Added period
      const data3 = 'The quick brown fox jumps over the lazy dog '; // Added space
      
      const checksum1 = validator.calculateChecksum(data1);
      const checksum2 = validator.calculateChecksum(data2);
      const checksum3 = validator.calculateChecksum(data3);
      
      expect(checksum1).not.toBe(checksum2);
      expect(checksum1).not.toBe(checksum3);
      expect(checksum2).not.toBe(checksum3);
    });
  });

  describe('validate()', () => {
    it('should return true for valid data and checksum', () => {
      const data = 'Valid test data';
      const checksum = validator.calculateChecksum(data);
      
      expect(validator.validate(data, checksum)).toBe(true);
    });

    it('should return false for invalid checksum', () => {
      const data = 'Test data';
      const wrongChecksum = 'invalid_checksum';
      
      expect(validator.validate(data, wrongChecksum)).toBe(false);
    });

    it('should return false when data is modified', () => {
      const originalData = 'Original data';
      const modifiedData = 'Modified data';
      const checksum = validator.calculateChecksum(originalData);
      
      expect(validator.validate(modifiedData, checksum)).toBe(false);
    });

    it('should handle empty string validation', () => {
      const checksum = validator.calculateChecksum('');
      
      expect(validator.validate('', checksum)).toBe(true);
      expect(validator.validate('not empty', checksum)).toBe(false);
    });

    it('should be consistent across multiple validations', () => {
      const data = 'Consistency test data';
      const checksum = validator.calculateChecksum(data);
      
      // Multiple validations should always return the same result
      expect(validator.validate(data, checksum)).toBe(true);
      expect(validator.validate(data, checksum)).toBe(true);
      expect(validator.validate(data, checksum)).toBe(true);
    });

    it('should handle large data validation', () => {
      const largeData = JSON.stringify({
        bigArray: new Array(10000).fill('data'),
        timestamp: Date.now(),
        metadata: 'x'.repeat(50000)
      });
      const checksum = validator.calculateChecksum(largeData);
      
      expect(validator.validate(largeData, checksum)).toBe(true);
      
      // Modify one character and it should fail
      const corruptedData = largeData.slice(0, -1) + 'Y';
      expect(validator.validate(corruptedData, checksum)).toBe(false);
    });

    it('should detect corruption in complex JSON data', () => {
      const complexData = JSON.stringify({
        user: {
          name: 'John Doe',
          settings: {
            theme: 'dark',
            notifications: true,
            preferences: ['email', 'sms']
          }
        },
        timestamp: 1234567890,
        version: '2.0.0'
      });
      
      const checksum = validator.calculateChecksum(complexData);
      expect(validator.validate(complexData, checksum)).toBe(true);
      
      // Simulate various types of corruption
      const corruptions = [
        complexData.replace('John Doe', 'Jane Doe'),
        complexData.replace('true', 'false'),
        complexData.replace('2.0.0', '2.0.1'),
        complexData.replace('[', '('),
        complexData + ' '
      ];
      
      corruptions.forEach((corruptedData) => {
        expect(validator.validate(corruptedData, checksum)).toBe(false);
      });
    });
  });

  describe('hash collision probability', () => {
    it('should have low collision rate for similar strings', () => {
      const baseString = 'collision test';
      const variants = [];
      const checksums = new Set();
      
      // Generate variants by adding numbers
      for (let i = 0; i < 1000; i++) {
        variants.push(`${baseString} ${i}`);
      }
      
      // Calculate checksums
      variants.forEach(variant => {
        const checksum = validator.calculateChecksum(variant);
        checksums.add(checksum);
      });
      
      // Should have very few (ideally zero) collisions
      const collisionRate = (variants.length - checksums.size) / variants.length;
      expect(collisionRate).toBeLessThan(0.01); // Less than 1% collision rate
    });
  });

  describe('integration with data integrity scenarios', () => {
    it('should detect data corruption in plugin data simulation', () => {
      const pluginData = {
        version: '2.0.0',
        compressed: true,
        chunks: 5,
        data: 'compressed_base64_data_here'.repeat(100)
      };
      
      const serialized = JSON.stringify(pluginData);
      const checksum = validator.calculateChecksum(serialized);
      
      // Original data should validate
      expect(validator.validate(serialized, checksum)).toBe(true);
      
      // Simulate corruption scenarios
      const corruptedVersions = [
        JSON.stringify({ ...pluginData, version: '2.0.1' }),
        JSON.stringify({ ...pluginData, chunks: 6 }),
        JSON.stringify({ ...pluginData, compressed: false }),
        serialized.slice(0, -10) + 'corrupted'
      ];
      
      corruptedVersions.forEach(corrupted => {
        expect(validator.validate(corrupted, checksum)).toBe(false);
      });
    });

    it('should work with workflow: compress -> validate -> decompress', () => {
      const originalData = 'This is the original data that will be processed';
      
      // Step 1: Calculate checksum of original
      const originalChecksum = validator.calculateChecksum(originalData);
      
      // Step 2: Simulate compression/processing (reversible transformation)
      const processedData = btoa(originalData); // base64 encode as example
      const processedChecksum = validator.calculateChecksum(processedData);
      
      // Step 3: Validate processed data
      expect(validator.validate(processedData, processedChecksum)).toBe(true);
      
      // Step 4: Simulate decompression
      const decompressedData = atob(processedData);
      
      // Step 5: Validate decompressed data matches original
      expect(validator.validate(decompressedData, originalChecksum)).toBe(true);
      expect(decompressedData).toBe(originalData);
    });
  });
});