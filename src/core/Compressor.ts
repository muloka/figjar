import { gzipSync, gunzipSync, gzip, gunzip } from 'fflate';
import { CompressionError } from '../utils/errors';

export class Compressor {
  private readonly CHUNK_SIZE = 65536; // 64KB chunks for safe string conversion
  
  compress(data: string): string {
    try {
      const input = new TextEncoder().encode(data);
      const compressed = gzipSync(input, { level: 6 });
      return this.uint8ArrayToBase64(compressed);
    } catch {
      throw new CompressionError('compress');
    }
  }
  
  private uint8ArrayToBase64(array: Uint8Array): string {
    // Process in chunks to avoid call stack issues with large arrays
    const chunks: string[] = [];
    for (let i = 0; i < array.length; i += this.CHUNK_SIZE) {
      const chunk = array.slice(i, i + this.CHUNK_SIZE);
      chunks.push(String.fromCharCode(...chunk));
    }
    return btoa(chunks.join(''));
  }
  
  decompress(data: string): string {
    try {
      const compressed = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const decompressed = gunzipSync(compressed);
      return new TextDecoder().decode(decompressed);
    } catch {
      throw new CompressionError('decompress');
    }
  }
  
  async compressAsync(data: string): Promise<string> {
    try {
      const input = new TextEncoder().encode(data);
      const compressed = await new Promise<Uint8Array>((resolve, reject) => {
        gzip(input, { level: 6 }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      return this.uint8ArrayToBase64(compressed);
    } catch {
      throw new CompressionError('compress');
    }
  }
  
  async decompressAsync(data: string): Promise<string> {
    try {
      const compressed = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const decompressed = await new Promise<Uint8Array>((resolve, reject) => {
        gunzip(compressed, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      return new TextDecoder().decode(decompressed);
    } catch {
      throw new CompressionError('decompress');
    }
  }
}