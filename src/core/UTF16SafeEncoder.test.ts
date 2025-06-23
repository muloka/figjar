import { UTF16SafeEncoder } from '../../src/core/UTF16SafeEncoder';

describe('UTF16SafeEncoder', () => {
  let encoder: UTF16SafeEncoder;

  beforeEach(() => {
    encoder = new UTF16SafeEncoder();
  });

  describe('Basic Encoding', () => {
    it('should encode and decode simple ASCII strings', () => {
      const input = 'Hello World';
      const encoded = encoder.encode(input);
      const decoded = encoder.decode(encoded);
      expect(decoded).toBe(input);
    });

    it('should encode and decode empty strings', () => {
      const input = '';
      const encoded = encoder.encode(input);
      const decoded = encoder.decode(encoded);
      expect(decoded).toBe(input);
    });

    it('should encode and decode single characters', () => {
      const inputs = ['a', '1', ' ', '@'];
      for (const input of inputs) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });
  });

  describe('Unicode Support', () => {
    it('should handle basic Unicode characters', () => {
      const unicodeStrings = [
        'café',           // Basic Latin with accents
        'naïve',          // More accents
        'Zürich',         // German umlauts
        'résumé',         // French accents
        'piñata'          // Spanish tilde
      ];

      for (const input of unicodeStrings) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });

    it('should handle emoji and complex Unicode', () => {
      const complexStrings = [
        '🚀',             // Rocket emoji
        '🎯🔥✨',          // Multiple emojis
        '👨‍💻',           // Composite emoji (man technologist)
        '🏳️‍🌈',          // Composite emoji (rainbow flag)
        'Hello 👋 World 🌍',  // Mixed text and emojis
      ];

      for (const input of complexStrings) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });

    it('should handle various scripts', () => {
      const scriptStrings = [
        'Здравствуй',     // Cyrillic
        '你好',           // Chinese
        'こんにちは',      // Japanese
        '안녕하세요',      // Korean
        'مرحبا',          // Arabic
        'שלום',           // Hebrew
        'नमस्ते',         // Hindi (Devanagari)
        'Γειά σου',       // Greek
      ];

      for (const input of scriptStrings) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });

    it('should handle special Unicode characters', () => {
      const specialStrings = [
        '\u0000',         // Null character
        '\u001F',         // Control character
        '\u00A0',         // Non-breaking space
        '\u2028',         // Line separator
        '\u2029',         // Paragraph separator
        '\uFEFF',         // Byte order mark
        '\uD83D\uDE00',   // Surrogate pair (grinning face emoji)
      ];

      for (const input of specialStrings) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });
  });

  describe('Large Text Handling', () => {
    it('should handle large ASCII strings', () => {
      const largeString = 'A'.repeat(10000);
      const encoded = encoder.encode(largeString);
      const decoded = encoder.decode(encoded);
      expect(decoded).toBe(largeString);
    });

    it('should handle large Unicode strings', () => {
      const largeUnicodeString = '🚀'.repeat(1000) + 'café'.repeat(1000);
      const encoded = encoder.encode(largeUnicodeString);
      const decoded = encoder.decode(encoded);
      expect(decoded).toBe(largeUnicodeString);
    });

    it('should handle mixed content large strings', () => {
      const mixedContent = Array.from({length: 1000}, (_, i) => 
        `Item ${i}: 🎯 café naïve ${i % 10} 你好 🌍`
      ).join('\n');
      
      const encoded = encoder.encode(mixedContent);
      const decoded = encoder.decode(encoded);
      expect(decoded).toBe(mixedContent);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully during encoding', () => {
      // Test with potentially problematic strings
      const problematicStrings = [
        String.fromCharCode(0xD800), // High surrogate without low surrogate
        String.fromCharCode(0xDC00), // Low surrogate without high surrogate
        '\uD800\uD800',              // Two high surrogates
        '\uDC00\uDC00',              // Two low surrogates
      ];

      for (const input of problematicStrings) {
        // Should not throw, even with malformed input
        expect(() => {
          const encoded = encoder.encode(input);
          expect(typeof encoded).toBe('string');
        }).not.toThrow();
      }
    });

    it('should handle invalid base64 during decoding gracefully', () => {
      const invalidBase64Strings = [
        'invalid!base64@',    // Invalid characters
        'SGVsbG8=extra',      // Extra characters
        'SGVsbG',             // Incomplete padding
        '!@#$%^&*()',         // Complete garbage
      ];

      for (const invalid of invalidBase64Strings) {
        // Should not throw, should fallback gracefully
        expect(() => {
          const decoded = encoder.decode(invalid);
          expect(typeof decoded).toBe('string');
        }).not.toThrow();
      }
    });

    it('should handle edge case characters that might break encoding', () => {
      const edgeCases = [
        '"',                  // Double quote
        "'",                  // Single quote
        '\\',                 // Backslash
        '\n',                 // Newline
        '\r',                 // Carriage return
        '\t',                 // Tab
        '\b',                 // Backspace
        '\f',                 // Form feed
        '\v',                 // Vertical tab
        '\0',                 // Null terminator
      ];

      for (const input of edgeCases) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });
  });

  describe('Base64 Output Validation', () => {
    it('should produce valid base64 output', () => {
      const testStrings = [
        'Hello World',
        'café 🚀',
        '你好世界',
        Array.from({length: 100}, () => Math.random().toString(36)).join('')
      ];

      for (const input of testStrings) {
        const encoded = encoder.encode(input);
        
        // Valid base64 should only contain these characters
        expect(encoded).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
        
        // Should be decodable
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });

    it('should handle strings that might cause URI encoding issues', () => {
      const uriProblematicStrings = [
        'hello%20world',      // Already URL encoded
        'test+string',        // Plus signs
        'question?mark',      // Question marks
        'hash#tag',           // Hash symbols
        'ampersand&symbol',   // Ampersands
        'equals=sign',        // Equals signs
      ];

      for (const input of uriProblematicStrings) {
        const encoded = encoder.encode(input);
        const decoded = encoder.decode(encoded);
        expect(decoded).toBe(input);
      }
    });
  });

  describe('Consistency and Idempotency', () => {
    it('should produce consistent results for the same input', () => {
      const input = 'Test string with unicode: 🚀 café';
      
      const encoded1 = encoder.encode(input);
      const encoded2 = encoder.encode(input);
      const encoded3 = encoder.encode(input);
      
      expect(encoded1).toBe(encoded2);
      expect(encoded2).toBe(encoded3);
    });

    it('should be idempotent for multiple encode/decode cycles', () => {
      const original = 'Original string with 🎯 emojis and café unicode';
      
      let current = original;
      
      // Multiple encode/decode cycles should preserve the original
      for (let i = 0; i < 5; i++) {
        const encoded = encoder.encode(current);
        current = encoder.decode(encoded);
      }
      
      expect(current).toBe(original);
    });

    it('should handle round-trip encoding correctly', () => {
      const complexString = JSON.stringify({
        text: 'Hello 🌍',
        emoji: '🚀🎯✨',
        unicode: 'café naïve résumé',
        scripts: '你好 こんにちは 안녕하세요',
        special: '\n\t\r\b\f\v',
        numbers: [1, 2, 3.14, -42],
        nested: {
          deep: {
            value: 'Deep nested 🏠 value'
          }
        }
      });

      const encoded = encoder.encode(complexString);
      const decoded = encoder.decode(encoded);
      
      expect(decoded).toBe(complexString);
      
      // Should be able to parse back to original object
      const parsedOriginal = JSON.parse(complexString);
      const parsedDecoded = JSON.parse(decoded);
      expect(parsedDecoded).toEqual(parsedOriginal);
    });
  });
});