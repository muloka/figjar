// Test setup for Node.js environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Simple Blob polyfill for tests
global.Blob = class MockBlob {
  size: number;
  type: string = '';
  
  constructor(parts: any[], options?: { type?: string }) {
    this.size = parts.reduce((acc, part) => {
      if (typeof part === 'string') {
        return acc + part.length;
      } else if (part instanceof ArrayBuffer) {
        return acc + part.byteLength;
      } else if (part instanceof Uint8Array) {
        return acc + part.byteLength;
      } else if (part && typeof part.length === 'number') {
        return acc + part.length;
      }
      return acc;
    }, 0);
    this.type = options?.type || '';
  }
  
  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Not implemented in test mock');
  }
  
  bytes(): Promise<Uint8Array> {
    throw new Error('Not implemented in test mock');
  }
  
  slice(): Blob {
    throw new Error('Not implemented in test mock');
  }
  
  stream(): ReadableStream {
    throw new Error('Not implemented in test mock');
  }
  
  text(): Promise<string> {
    throw new Error('Not implemented in test mock');
  }
} as any;

// btoa/atob polyfills
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');