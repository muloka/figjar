# figjar 🏺

Maximize Figma plugin storage with intelligent compression and chunking - get the most out of Figma's 5MB quota with zero configuration.

[![npm version](https://img.shields.io/npm/v/figjar.svg)](https://www.npmjs.com/package/figjar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

✅ **5MB Optimized** - Maximize Figma's total plugin quota efficiently  
✅ **Zero Config** - Works immediately, no setup required  
✅ **Drop-in Replacement** - Same API as native `setPluginData`  
✅ **Automatic Everything** - Compression, chunking, validation  
✅ **Type Safe** - Full TypeScript support with generics  
✅ **UTF-16 Safe** - Handles all Unicode correctly  
✅ **Data Integrity** - Automatic corruption detection  
✅ **Quota Management** - Global tracking across all nodes and keys  

## 📦 Installation

```bash
npm install figjar
```

## 🎯 Quick Start

```typescript
import { PluginData } from 'figjar';

// That's it! No configuration needed
const storage = new PluginData(figma.currentPage);

// Store anything - automatic serialization, compression, chunking
const myData = {
  components: Array(1000).fill({ type: 'button', props: {} }),
  theme: { colors: { primary: '#000' }, fonts: {} },
  settings: { user: 'John', preferences: {} }
};

storage.setPluginData('my-data', myData);

// Get it back - automatic decompression, reassembly, deserialization
const retrieved = storage.getPluginData('my-data');
```

## 🔄 Migration from Native API

```typescript
// Before - with native API (limited to 100KB per entry)
node.setPluginData('key', JSON.stringify(data));
const data = JSON.parse(node.getPluginData('key'));

// After - with figjar (intelligent storage optimization)
const storage = new PluginData(node);
storage.setPluginData('key', data);  // Auto JSON.stringify
const data = storage.getPluginData('key');  // Auto JSON.parse

// Migrate existing data automatically
const result = await storage.migrateFromNative();
console.log(`Migrated ${result.migrated.length} keys`);
```

## 📚 API Reference

### Constructor

```typescript
new PluginData(node: BaseNode)
```

Creates a new storage instance for the given node. No configuration needed.

### Storage Methods

#### setPluginData

```typescript
setPluginData<T>(key: string, value: T): void
```

Stores data efficiently within Figma's 5MB quota. Automatically handles:
- JSON serialization for objects
- Gzip compression (always enabled)
- Chunking for data > 85KB
- UTF-16 safe encoding
- Data integrity checksums
- Global quota tracking

#### getPluginData

```typescript
getPluginData<T>(key: string): T
```

Retrieves stored data. Automatically handles:
- Chunk reassembly
- Decompression
- JSON deserialization
- Data integrity validation

#### getPluginDataKeys

```typescript
getPluginDataKeys(): string[]
```

Returns all user keys (excludes internal figjar keys).

#### deletePluginData

```typescript
deletePluginData(key: string): void
```

Removes data and all associated chunks/metadata. Updates quota tracking.

### Quota Management

#### getQuotaStats

```typescript
getQuotaStats(): {
  used: number;
  available: number; 
  remaining: number;
  utilizationPercent: number;
}
```

Get current quota usage statistics.

#### getQuotaUsage

```typescript
getQuotaUsage(): QuotaReport
```

Get detailed usage breakdown by nodes and keys.

#### cleanupNode

```typescript
cleanupNode(): void
```

Remove all figjar data for this node and update quota tracking.

#### optimizeStorage

```typescript
optimizeStorage(): {
  bytesSaved: number;
  keysOptimized: number;
}
```

Re-compress all data to potentially save space.

### Migration

#### migrateFromNative

```typescript
migrateFromNative(keys?: string[]): Promise<IMigrationResult>
```

Migrate existing native plugin data to figjar format.

```typescript
interface IMigrationResult {
  migrated: string[];
  failed: string[];
  skipped: string[];
}
```

## 🏗️ Architecture

### How figjar Works

1. **Compression First**: All data is automatically compressed with gzip
2. **Smart Chunking**: If compressed data > 85KB, it's split into chunks  
3. **Entry Validation**: Each chunk + key must be ≤ 100KB (Figma's limit)
4. **Global Tracking**: Monitors total usage across all nodes (5MB limit)
5. **Metadata Management**: Stores checksums and chunk info separately

### Key Limits

- **Total Quota**: 5MB across all plugin data (Figma limitation)
- **Entry Size**: 100KB per setPluginData call (Figma limitation)  
- **Chunk Size**: 85KB data + ~15KB key overhead = safe 100KB entries
- **Individual Data**: 5MB before compression (architectural limit)

## ⚠️ Error Handling

figjar throws 6 specific error types:

```typescript
import { 
  DataTooLargeError,      // Data > 5MB before compression
  DataCorruptedError,     // Checksum validation failed
  InvalidKeyError,        // Empty key or starts with '__fpdu_'
  CompressionError,       // Compression/decompression failed
  QuotaExceededError,     // Would exceed 5MB total quota
  EntryTooLargeError      // Entry would exceed 100KB limit
} from 'figjar';
```

## 🚀 Performance

*Validated performance characteristics (tested on production hardware):*

### Operation Speed
- **1KB data**: 0.39ms median, 0.93ms P95
- **10KB data**: 1.43ms median, 1.89ms P95  
- **50KB data**: 7.80ms median, 8.03ms P95
- **1MB data**: 94.7ms median, 105.8ms P95
- **Target**: All operations well within < 200ms for 1MB, < 50ms for smaller data ✅

### Compression Efficiency
- **Settings data**: 92.6% compression (realistic user preferences)
- **Component data**: 71.6% compression (design system components)
- **Token data**: 79.4% compression (design tokens and values)
- **Repetitive data**: 97-99% compression (patterns and templates)
- **Target**: All data types achieve > 60% compression ✅

### Memory Usage
- **Overhead**: < 10% of data size for efficient storage
- **Stability**: No memory leaks during extended usage
- **Cleanup**: Proper memory release when data is deleted
- **Concurrent**: Handles multiple nodes efficiently

## 🔧 Advanced Usage

### Global Quota Management

```typescript
import { GlobalQuotaManager } from 'figjar';

// Check total usage across all nodes
const usage = GlobalQuotaManager.getCurrentUsage();
const remaining = GlobalQuotaManager.getRemainingQuota();

// Get detailed breakdown
const report = GlobalQuotaManager.getUsageReport();
console.log('Per-node usage:', report.nodeBreakdown);
console.log('Per-key usage:', report.keyBreakdown);

// Reset tracking (useful for testing)
GlobalQuotaManager.reset();
```

### Performance Monitoring

```typescript
const storage = new PluginData(node);

// Store large dataset
const startTime = performance.now();
storage.setPluginData('large-dataset', myLargeObject);
const storeTime = performance.now() - startTime;

// Check compression effectiveness
const stats = storage.getQuotaStats();
console.log(`Stored data using ${stats.utilizationPercent.toFixed(1)}% of quota`);

// Optimize if needed
const optimization = storage.optimizeStorage();
console.log(`Saved ${optimization.bytesSaved} bytes`);
```

### Error Recovery

```typescript
try {
  storage.setPluginData('key', data);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Clean up old data or optimize
    storage.optimizeStorage();
    // Try again or notify user
  } else if (error instanceof DataTooLargeError) {
    // Data is > 5MB, need to split or reduce
    console.log('Data too large:', error.actualSize);
  } else if (error instanceof EntryTooLargeError) {
    // Shouldn't happen with figjar, but indicates bug
    console.error('Entry validation failed:', error);
  }
}
```

## 📈 Performance Best Practices

### Optimize Data for Compression
```typescript
// ✅ Good: Structured data with patterns
const settings = {
  users: Array(10).fill(null).map((_, i) => ({
    id: `user_${i}`,
    preferences: { theme: 'dark', language: 'en' } // Repeated patterns
  }))
};

// ❌ Avoid: Completely random data
const badData = { entropy: crypto.randomUUID().repeat(1000) };
```

### Monitor Quota Usage
```typescript
const storage = new PluginData(node);

// Check before storing large data
const stats = storage.getQuotaStats();
if (stats.utilizationPercent > 80) {
  console.warn('Approaching quota limit:', stats);
  storage.optimizeStorage(); // Re-compress existing data
}
```

### Handle Large Datasets
```typescript
// ✅ Good: Store data incrementally
const components = generateLargeComponentLibrary();
for (const chunk of chunkArray(components, 50)) {
  storage.setPluginData(`components_${chunk.id}`, chunk);
}

// ❌ Avoid: Single 4MB+ operations near quota limit
storage.setPluginData('everything', massiveDataObject);
```

### Performance Testing
```typescript
// Measure operation performance
const start = performance.now();
storage.setPluginData('key', data);
const duration = performance.now() - start;

console.log(`Operation took ${duration.toFixed(2)}ms`);
// Expected: < 50ms for small data, < 200ms for 1MB
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## 📄 License

MIT © muloka

## 🙏 Acknowledgments

- Built for the Figma plugin community
- Inspired by the need for efficient data storage in design tools
- Thanks to all contributors and testers

---

**figjar** - Because your plugin data deserves more space! 🏺✨