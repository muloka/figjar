import { ChunkManager } from './core/ChunkManager';
import { Compressor } from './core/Compressor';
import { IntegrityValidator } from './core/IntegrityValidator';
import { GlobalQuotaManager } from './core/GlobalQuotaManager';
import { 
  DataTooLargeError, 
  DataCorruptedError, 
  InvalidKeyError,
  CompressionError,
  QuotaExceededError,
  EntryTooLargeError
} from './utils/errors';
import { IMigrationResult, BaseNode, QuotaReport } from './types';

export class PluginData<T = string> {
  private readonly chunkManager: ChunkManager;
  private readonly compressor: Compressor;
  private readonly validator: IntegrityValidator;
  
  constructor(private node: BaseNode) {
    this.chunkManager = new ChunkManager();
    this.compressor = new Compressor();
    this.validator = new IntegrityValidator();
  }
  
  setPluginData<K = T>(key: string, value: K): void {
    if (!key || key.startsWith('__fpdu_')) {
      throw new InvalidKeyError(key);
    }
    
    const data = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);
    
    // Check overall data size limit before processing
    const size = new Blob([data]).size;
    if (size > 5 * 1024 * 1024) {
      throw new DataTooLargeError(size);
    }
    
    try {
      const compressed = this.compressor.compress(data);
      
      // Pre-validate total quota (estimate compressed size + metadata overhead)
      const estimatedSize = compressed.length + 200; // ~200 bytes for metadata
      if (!GlobalQuotaManager.canStore(estimatedSize)) {
        const remaining = GlobalQuotaManager.getRemainingQuota();
        throw new QuotaExceededError(estimatedSize, remaining);
      }
      
      // Remove old usage if key exists
      const oldUsage = GlobalQuotaManager.getKeyUsage(this.node.id, key);
      if (oldUsage > 0) {
        GlobalQuotaManager.removeUsage(this.node.id, key);
      }
      
      // Determine storage strategy
      const maxChunkSize = this.chunkManager.getSafeChunkSize(key);
      if (compressed.length > maxChunkSize) {
        this.storeChunked(key, compressed, data);
      } else {
        this.storeSingle(key, compressed, data);
      }
      
    } catch (error) {
      if (error instanceof QuotaExceededError || error instanceof EntryTooLargeError) {
        throw error;
      }
      throw new CompressionError('compress');
    }
  }
  
  private storeSingle(key: string, compressed: string, originalData: string): void {
    const metadata = {
      compressed: true,
      checksum: this.validator.calculateChecksum(originalData),
      size: new Blob([originalData]).size
    };
    
    const metadataStr = JSON.stringify(metadata);
    const metadataKey = `__fpdu_meta_${key}`;
    
    // Validate entry sizes
    GlobalQuotaManager.validateEntrySize(key, compressed);
    GlobalQuotaManager.validateEntrySize(metadataKey, metadataStr);
    
    // Store data and metadata
    this.node.setPluginData(key, compressed);
    this.node.setPluginData(metadataKey, metadataStr);
    
    // Track usage
    const totalUsage = compressed.length + metadataKey.length + metadataStr.length;
    GlobalQuotaManager.recordUsage(this.node.id, key, totalUsage);
  }
  
  getPluginData<K = T>(key: string): K {
    const metadataStr = this.node.getPluginData(`__fpdu_meta_${key}`);
    
    if (!metadataStr) {
      const value = this.node.getPluginData(key);
      return value as K;
    }
    
    try {
      const metadata = JSON.parse(metadataStr);
      
      if (metadata.chunked) {
        return this.retrieveChunked(key, metadata);
      } else {
        const compressed = this.node.getPluginData(key);
        const decompressed = this.compressor.decompress(compressed);
        
        if (!this.validator.validate(decompressed, metadata.checksum)) {
          throw new DataCorruptedError(key);
        }
        
        try {
          return JSON.parse(decompressed) as K;
        } catch {
          return decompressed as K;
        }
      }
    } catch (error) {
      if (error instanceof DataCorruptedError) {
        throw error;
      }
      throw new DataCorruptedError(key);
    }
  }
  
  async getPluginDataAsync<K = T>(key: string): Promise<K> {
    const metadataStr = this.node.getPluginData(`__fpdu_meta_${key}`);
    
    if (!metadataStr) {
      const value = this.node.getPluginData(key);
      return value as K;
    }
    
    try {
      const metadata = JSON.parse(metadataStr);
      
      if (metadata.chunked) {
        return await this.retrieveChunkedAsync(key, metadata);
      } else {
        const compressed = this.node.getPluginData(key);
        const decompressed = await this.compressor.decompressAsync(compressed);
        
        if (!this.validator.validate(decompressed, metadata.checksum)) {
          throw new DataCorruptedError(key);
        }
        
        try {
          return JSON.parse(decompressed) as K;
        } catch {
          return decompressed as K;
        }
      }
    } catch (error) {
      if (error instanceof DataCorruptedError) {
        throw error;
      }
      throw new DataCorruptedError(key);
    }
  }
  
  getPluginDataKeys(): string[] {
    return this.node.getPluginDataKeys()
      .filter((key: string) => !key.startsWith('__fpdu_'));
  }

  // Memory Management Methods
  
  getQuotaUsage(): QuotaReport {
    return GlobalQuotaManager.getUsageReport();
  }

  getQuotaStats(): { used: number; available: number; remaining: number; utilizationPercent: number } {
    return GlobalQuotaManager.getQuotaStats();
  }

  cleanupNode(): void {
    // Remove all plugin data for this node
    const keys = this.getPluginDataKeys();
    for (const key of keys) {
      this.deletePluginData(key);
    }
    
    // Clean up quota tracking
    GlobalQuotaManager.cleanupNode(this.node.id);
  }

  async setPluginDataAsync<K = T>(key: string, value: K): Promise<void> {
    if (!key || key.startsWith('__fpdu_')) {
      throw new InvalidKeyError(key);
    }
    
    const data = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);
    
    // Check overall data size limit before processing
    const size = new Blob([data]).size;
    if (size > 5 * 1024 * 1024) {
      throw new DataTooLargeError(size);
    }
    
    try {
      const compressed = await this.compressor.compressAsync(data);
      
      // Pre-validate total quota (estimate compressed size + metadata overhead)
      const estimatedSize = compressed.length + 200; // ~200 bytes for metadata
      if (!GlobalQuotaManager.canStore(estimatedSize)) {
        const remaining = GlobalQuotaManager.getRemainingQuota();
        throw new QuotaExceededError(estimatedSize, remaining);
      }
      
      // Remove old usage if key exists
      const oldUsage = GlobalQuotaManager.getKeyUsage(this.node.id, key);
      if (oldUsage > 0) {
        GlobalQuotaManager.removeUsage(this.node.id, key);
      }
      
      // Determine storage strategy
      const maxChunkSize = this.chunkManager.getSafeChunkSize(key);
      if (compressed.length > maxChunkSize) {
        await this.storeChunkedAsync(key, compressed, data);
      } else {
        await this.storeSingleAsync(key, compressed, data);
      }
      
    } catch (error) {
      if (error instanceof QuotaExceededError || error instanceof EntryTooLargeError) {
        throw error;
      }
      throw new CompressionError('compress');
    }
  }

  deletePluginData(key: string): void {
    const metadataStr = this.node.getPluginData(`__fpdu_meta_${key}`);
    
    if (metadataStr) {
      try {
        const metadata = JSON.parse(metadataStr);
        
        // Remove chunked data if exists
        if (metadata.chunked) {
          for (let i = 0; i < metadata.totalChunks; i++) {
            const chunkKey = this.chunkManager.calculateChunkKey(key, i);
            this.node.setPluginData(chunkKey, '');
          }
        }
        
        // Remove metadata
        this.node.setPluginData(`__fpdu_meta_${key}`, '');
      } catch {
        // If metadata is corrupted, just try to remove what we can
      }
    }
    
    // Remove main data
    this.node.setPluginData(key, '');
    
    // Update quota tracking
    GlobalQuotaManager.removeUsage(this.node.id, key);
  }

  async deletePluginDataAsync(key: string): Promise<void> {
    const metadataStr = this.node.getPluginData(`__fpdu_meta_${key}`);
    
    if (metadataStr) {
      try {
        const metadata = JSON.parse(metadataStr);
        
        // Remove chunked data if exists - use Promise.all() for parallel deletion
        if (metadata.chunked) {
          const deletePromises = [];
          for (let i = 0; i < metadata.totalChunks; i++) {
            const chunkKey = this.chunkManager.calculateChunkKey(key, i);
            deletePromises.push(new Promise<void>((resolve) => {
              this.node.setPluginData(chunkKey, '');
              resolve();
            }));
          }
          await Promise.all(deletePromises);
        }
        
        // Remove metadata
        this.node.setPluginData(`__fpdu_meta_${key}`, '');
      } catch {
        // If metadata is corrupted, just try to remove what we can
      }
    }
    
    // Remove main data
    this.node.setPluginData(key, '');
    
    // Update quota tracking
    GlobalQuotaManager.removeUsage(this.node.id, key);
  }

  optimizeStorage(): { bytesSaved: number; keysOptimized: number } {
    let totalBytesSaved = 0;
    let keysOptimized = 0;
    const keys = this.getPluginDataKeys();
    
    for (const key of keys) {
      try {
        const oldUsage = GlobalQuotaManager.getKeyUsage(this.node.id, key);
        if (oldUsage === 0) continue;
        
        // Get current data
        const data = this.getPluginData(key);
        
        // Re-store with potentially better compression
        this.setPluginData(key, data);
        
        const newUsage = GlobalQuotaManager.getKeyUsage(this.node.id, key);
        if (newUsage < oldUsage) {
          totalBytesSaved += (oldUsage - newUsage);
          keysOptimized++;
        }
      } catch {
        // Skip keys that fail optimization
      }
    }
    
    return { bytesSaved: totalBytesSaved, keysOptimized };
  }
  
  async optimizeStorageAsync(): Promise<{ bytesSaved: number; keysOptimized: number }> {
    let totalBytesSaved = 0;
    let keysOptimized = 0;
    const keys = this.getPluginDataKeys();
    
    for (const key of keys) {
      try {
        const oldUsage = GlobalQuotaManager.getKeyUsage(this.node.id, key);
        if (oldUsage === 0) continue;
        
        // Get current data using async method
        const data = await this.getPluginDataAsync(key);
        
        // Re-store with potentially better compression using async method
        await this.setPluginDataAsync(key, data);
        
        const newUsage = GlobalQuotaManager.getKeyUsage(this.node.id, key);
        if (newUsage < oldUsage) {
          totalBytesSaved += (oldUsage - newUsage);
          keysOptimized++;
        }
      } catch {
        // Skip keys that fail optimization
      }
    }
    
    return { bytesSaved: totalBytesSaved, keysOptimized };
  }
  
  async migrateFromNative(keys?: string[]): Promise<IMigrationResult> {
    const targetKeys = keys || this.node.getPluginDataKeys()
      .filter((k: string) => !k.startsWith('__fpdu_'));
    
    const result: IMigrationResult = {
      migrated: [],
      failed: [],
      skipped: []
    };
    
    for (const key of targetKeys) {
      try {
        // Check if this key already has metadata (already migrated)
        const metadataStr = this.node.getPluginData(`__fpdu_meta_${key}`);
        if (metadataStr) {
          result.skipped.push(key);
          continue;
        }
        
        const value = this.node.getPluginData(key);
        if (!value) {
          result.skipped.push(key);
          continue;
        }
        
        // Store with new system (this overwrites the original data with compressed version)
        this.setPluginData(key, value);
        
        // No need to clear - setPluginData already replaced the raw data with compressed data
        
        result.migrated.push(key);
      } catch (error) {
        result.failed.push(key);
      }
    }
    
    return result;
  }
  
  async migrateFromNativeAsync(keys?: string[]): Promise<IMigrationResult> {
    const targetKeys = keys || this.node.getPluginDataKeys()
      .filter((k: string) => !k.startsWith('__fpdu_'));
    
    const result: IMigrationResult = {
      migrated: [],
      failed: [],
      skipped: []
    };
    
    for (const key of targetKeys) {
      try {
        // Check if this key already has metadata (already migrated)
        const metadataStr = this.node.getPluginData(`__fpdu_meta_${key}`);
        if (metadataStr) {
          result.skipped.push(key);
          continue;
        }
        
        const value = this.node.getPluginData(key);
        if (!value) {
          result.skipped.push(key);
          continue;
        }
        
        // Store with new async system (this overwrites the original data with compressed version)
        await this.setPluginDataAsync(key, value);
        
        // No need to clear - setPluginDataAsync already replaced the raw data with compressed data
        
        result.migrated.push(key);
      } catch (error) {
        result.failed.push(key);
      }
    }
    
    return result;
  }
  
  private storeChunked(key: string, compressed: string, original: string): void {
    const chunks = this.chunkManager.chunk(compressed);
    let totalUsage = 0;
    
    // Store chunks with validation
    chunks.chunks.forEach((chunk, index) => {
      const chunkKey = this.chunkManager.calculateChunkKey(key, index);
      
      // Validate each chunk entry
      this.chunkManager.validateChunkEntry(chunkKey, chunk);
      
      this.node.setPluginData(chunkKey, chunk);
      totalUsage += chunkKey.length + chunk.length;
    });
    
    // Store metadata
    const metadata = {
      compressed: true,
      chunked: true,
      totalChunks: chunks.chunks.length,
      checksum: this.validator.calculateChecksum(original),
      size: new Blob([original]).size
    };
    
    const metadataStr = JSON.stringify(metadata);
    const metadataKey = `__fpdu_meta_${key}`;
    
    // Validate metadata entry
    GlobalQuotaManager.validateEntrySize(metadataKey, metadataStr);
    
    this.node.setPluginData(metadataKey, metadataStr);
    totalUsage += metadataKey.length + metadataStr.length;
    
    // Track total usage for this key
    GlobalQuotaManager.recordUsage(this.node.id, key, totalUsage);
  }
  
  private async storeSingleAsync(key: string, compressed: string, originalData: string): Promise<void> {
    const metadata = {
      compressed: true,
      checksum: this.validator.calculateChecksum(originalData),
      size: new Blob([originalData]).size
    };
    
    const metadataStr = JSON.stringify(metadata);
    const metadataKey = `__fpdu_meta_${key}`;
    
    // Validate entry sizes
    GlobalQuotaManager.validateEntrySize(key, compressed);
    GlobalQuotaManager.validateEntrySize(metadataKey, metadataStr);
    
    // Store data and metadata (wrapped in promises for consistency)
    await Promise.all([
      new Promise<void>((resolve) => {
        this.node.setPluginData(key, compressed);
        resolve();
      }),
      new Promise<void>((resolve) => {
        this.node.setPluginData(metadataKey, metadataStr);
        resolve();
      })
    ]);
    
    // Track usage
    const totalUsage = compressed.length + metadataKey.length + metadataStr.length;
    GlobalQuotaManager.recordUsage(this.node.id, key, totalUsage);
  }
  
  private async storeChunkedAsync(key: string, compressed: string, original: string): Promise<void> {
    const chunks = this.chunkManager.chunk(compressed);
    let totalUsage = 0;
    
    // Store chunks with Promise.all() for parallel operations
    const chunkPromises = chunks.chunks.map(async (chunk, index) => {
      const chunkKey = this.chunkManager.calculateChunkKey(key, index);
      
      // Validate each chunk entry
      this.chunkManager.validateChunkEntry(chunkKey, chunk);
      
      return new Promise<void>((resolve) => {
        this.node.setPluginData(chunkKey, chunk);
        resolve();
      });
    });
    
    // Wait for all chunks to be stored
    await Promise.all(chunkPromises);
    
    // Calculate total usage from chunks
    chunks.chunks.forEach((chunk, index) => {
      const chunkKey = this.chunkManager.calculateChunkKey(key, index);
      totalUsage += chunkKey.length + chunk.length;
    });
    
    // Store metadata
    const metadata = {
      compressed: true,
      chunked: true,
      totalChunks: chunks.chunks.length,
      checksum: this.validator.calculateChecksum(original),
      size: new Blob([original]).size
    };
    
    const metadataStr = JSON.stringify(metadata);
    const metadataKey = `__fpdu_meta_${key}`;
    
    // Validate metadata entry
    GlobalQuotaManager.validateEntrySize(metadataKey, metadataStr);
    
    this.node.setPluginData(metadataKey, metadataStr);
    totalUsage += metadataKey.length + metadataStr.length;
    
    // Track total usage for this key
    GlobalQuotaManager.recordUsage(this.node.id, key, totalUsage);
  }
  
  private retrieveChunked<K>(key: string, metadata: any): K {
    const chunks: string[] = [];
    
    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkKey = this.chunkManager.calculateChunkKey(key, i);
      const chunk = this.node.getPluginData(chunkKey);
      if (!chunk) {
        throw new DataCorruptedError(key);
      }
      chunks.push(chunk);
    }
    
    const compressed = chunks.join('');
    const decompressed = this.compressor.decompress(compressed);
    
    if (!this.validator.validate(decompressed, metadata.checksum)) {
      throw new DataCorruptedError(key);
    }
    
    try {
      return JSON.parse(decompressed) as K;
    } catch {
      return decompressed as K;
    }
  }
  
  private async retrieveChunkedAsync<K>(key: string, metadata: any): Promise<K> {
    const chunks: string[] = [];
    
    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkKey = this.chunkManager.calculateChunkKey(key, i);
      const chunk = this.node.getPluginData(chunkKey);
      if (!chunk) {
        throw new DataCorruptedError(key);
      }
      chunks.push(chunk);
    }
    
    const compressed = chunks.join('');
    const decompressed = await this.compressor.decompressAsync(compressed);
    
    if (!this.validator.validate(decompressed, metadata.checksum)) {
      throw new DataCorruptedError(key);
    }
    
    try {
      return JSON.parse(decompressed) as K;
    } catch {
      return decompressed as K;
    }
  }
}