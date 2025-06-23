export class DataTooLargeError extends Error {
  constructor(public actualSize: number) {
    super(`Data size ${(actualSize / 1024 / 1024).toFixed(2)}MB exceeds 5MB total plugin quota`);
    this.name = 'DataTooLargeError';
  }
}

export class QuotaExceededError extends Error {
  constructor(needed: number, remaining: number) {
    super(`Need ${(needed / 1024).toFixed(1)}KB but only ${(remaining / 1024).toFixed(1)}KB remaining of 5MB quota`);
    this.name = 'QuotaExceededError';
  }
}

export class EntryTooLargeError extends Error {
  constructor(entrySize: number, maxSize: number = 100 * 1024) {
    super(`Entry ${(entrySize / 1024).toFixed(1)}KB exceeds ${(maxSize / 1024).toFixed(1)}KB limit per setPluginData call`);
    this.name = 'EntryTooLargeError';
  }
}

export class DataCorruptedError extends Error {
  constructor(public key: string) {
    super(`Data for key "${key}" is corrupted or incomplete`);
    this.name = 'DataCorruptedError';
  }
}

export class InvalidKeyError extends Error {
  constructor(public key: string) {
    super(`Invalid key: "${key}" (keys cannot be empty or start with __fpdu_)`);
    this.name = 'InvalidKeyError';
  }
}

export class CompressionError extends Error {
  constructor(public operation: 'compress' | 'decompress') {
    super(`Failed to ${operation} data`);
    this.name = 'CompressionError';
  }
}