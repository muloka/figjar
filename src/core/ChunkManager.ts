export class ChunkManager {
  // Safe chunk size accounting for key overhead
  // Max entry: 100KB, typical key: '__fpdu_chunk_keyname_999' (~25 bytes)
  private readonly CHUNK_SIZE = 85 * 1024; // 85KB data + ~15KB buffer for keys/metadata
  private readonly MAX_ENTRY_SIZE = 100 * 1024; // 100KB per Figma API
  
  chunk(data: string): { chunks: string[]; totalSize: number } {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      chunks.push(data.slice(i, i + this.CHUNK_SIZE));
    }
    return { chunks, totalSize: data.length };
  }

  calculateChunkKey(baseKey: string, index: number): string {
    return `__fpdu_chunk_${baseKey}_${index}`;
  }

  validateChunkEntry(key: string, chunk: string): void {
    const entrySize = key.length + chunk.length;
    if (entrySize > this.MAX_ENTRY_SIZE) {
      // Import proper error class dynamically to avoid circular imports
      const EntryTooLargeError = require('../utils/errors').EntryTooLargeError;
      throw new EntryTooLargeError(entrySize, this.MAX_ENTRY_SIZE);
    }
  }

  getSafeChunkSize(baseKey: string): number {
    // Calculate the largest chunk size that leaves room for the key
    const longestPossibleKey = this.calculateChunkKey(baseKey, 999); // Assume max 999 chunks
    const keyOverhead = longestPossibleKey.length;
    return this.MAX_ENTRY_SIZE - keyOverhead;
  }

  getMaxEntrySize(): number {
    return this.MAX_ENTRY_SIZE;
  }
}