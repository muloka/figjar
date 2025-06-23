# Performance Monitoring Guide for figjar

## Overview
This guide provides comprehensive instructions for monitoring and maintaining figjar's performance characteristics throughout development and in production.

## Validated Performance Baseline

### Core Performance Metrics (December 2024)
- **1KB data**: 0.39ms median, 0.93ms P95
- **10KB data**: 1.43ms median, 1.89ms P95
- **50KB data**: 7.80ms median, 8.03ms P95
- **1MB data**: 94.7ms median, 105.8ms P95

### Compression Performance
- **Settings data**: 92.6% compression
- **Component data**: 71.6% compression
- **Token data**: 79.4% compression
- **Repetitive data**: 97-99% compression

### Memory Characteristics
- **Overhead**: < 10% of data size
- **Stability**: No memory leaks over 100+ operations
- **Cleanup**: Proper memory release on deletion

## Performance Testing Commands

### Quick Performance Check
```bash
# Run core benchmark tests (< 2 minutes)
npm run test:performance:quick

# Expected output:
# ✅ All small data operations < 50ms
# ✅ 1MB operations < 200ms
# ✅ Chunking performance within targets
```

### Full Performance Validation
```bash
# Complete performance test suite (5-10 minutes)
npm run test:performance

# Includes:
# - Benchmark tests
# - Compression ratio validation
# - Memory leak detection
# - Real-world scenarios
# - API comparisons
```

### Memory Leak Testing
```bash
# Memory tests with garbage collection
npm run test:performance:memory

# Expected:
# ✅ < 100KB growth per operation
# ✅ Stable memory usage over time
# ✅ Proper cleanup on deletion
```

### Coverage with Performance
```bash
# Full validation pipeline
npm run validate

# Runs:
# 1. Unit tests + integration tests
# 2. Performance test suite
# 3. Production build verification
```

## Continuous Monitoring

### CI/CD Integration (Recommended)
Add to your GitHub Actions workflow:

```yaml
name: Performance Validation

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - run: npm ci
    - run: npm run validate
    - run: npm run test:performance
      
    # Store results for trend analysis
    - uses: actions/upload-artifact@v4
      with:
        name: performance-results
        path: performance-test-results.log
```

### Performance Budgets
Set hard limits to catch regressions:

```typescript
// In tests/performance/budgets.ts
export const PERFORMANCE_BUDGETS = {
  smallData: {
    median: 50,    // ms
    p95: 75        // ms
  },
  largeData: {
    median: 200,   // ms for 1MB
    p95: 500       // ms for 1MB
  },
  compression: {
    settings: 0.8,   // 80% minimum
    components: 0.6, // 60% minimum
    tokens: 0.6,     // 60% minimum
    repetitive: 0.9  // 90% minimum
  },
  memory: {
    overhead: 0.1,        // 10% maximum
    growthPerOp: 100000   // 100KB maximum
  }
};
```

## Regression Detection

### Key Metrics to Monitor

#### 🔴 Critical Regressions (Immediate Action Required)
- Small data operations > 100ms median
- 1MB operations > 400ms median
- Any compression ratio < 50%
- Memory leaks detected (> 1MB growth per 100 operations)

#### 🟡 Performance Degradation (Investigate)
- Small data operations > 25ms median  
- 1MB operations > 250ms median
- Compression ratios drop > 10% from baseline
- Memory overhead > 15%

#### 🟢 Performance Within Targets
- Small data operations < 50ms median
- 1MB operations < 200ms median
- Compression ratios maintain baseline ±5%
- Memory overhead < 10%

### Automated Alerting
Set up alerts for regression detection:

```bash
# Example alert script
#!/bin/bash
npm run test:performance > perf_results.log 2>&1

# Check for failures
if grep -q "failed" perf_results.log; then
  echo "❌ Performance regression detected!"
  echo "Review perf_results.log for details"
  exit 1
fi

# Check specific metrics
if grep -q "median.*[5-9][0-9][0-9]ms" perf_results.log; then
  echo "⚠️ Slow operation detected (>500ms)"
  exit 1
fi

echo "✅ Performance within targets"
```

## Troubleshooting Performance Issues

### Common Performance Problems

#### Slow Compression (> 500ms for 1MB)
**Symptoms**: Compression taking longer than expected
**Causes**:
- Large, incompressible data (random/encrypted content)
- Memory pressure during compression
- JavaScript engine optimization issues

**Solutions**:
```typescript
// Check data compressibility
const testData = JSON.stringify(yourData);
const compressible = testData.length > testData.split('').filter((c, i, arr) => arr.indexOf(c) === i).length * 10;

if (!compressible) {
  console.warn('Data has low compressibility');
  // Consider data restructuring or chunking
}
```

#### Memory Growth During Operations
**Symptoms**: Memory usage increasing over time
**Causes**:
- Retained references to large objects
- Event listeners not cleaned up
- Circular references in data

**Solutions**:
```typescript
// Monitor memory usage
const monitor = new MemoryMonitor();
monitor.start();

// ... operations ...

const analysis = monitor.analyze();
if (analysis.heapGrowth > 10 * 1024 * 1024) { // 10MB
  console.warn('Excessive memory growth detected');
}
```

#### Quota Exceeded Errors
**Symptoms**: `QuotaExceededError` thrown unexpectedly
**Causes**:
- Multiple large operations without quota tracking
- Inefficient data storage patterns
- Metadata overhead not accounted for

**Solutions**:
```typescript
// Check quota before large operations
const stats = storage.getQuotaStats();
if (stats.utilizationPercent > 80) {
  console.warn('Approaching quota limit');
  
  // Optimize existing data
  const result = storage.optimizeStorage();
  console.log(`Saved ${result.bytesSaved} bytes`);
}
```

### Performance Profiling

#### CPU Profiling
```bash
# Profile performance-critical operations
node --prof node_modules/.bin/jest tests/performance/benchmark.test.ts

# Analyze profile
node --prof-process isolate-*.log > cpu-profile.txt
```

#### Memory Profiling
```bash
# Enable heap snapshots
node --inspect --expose-gc node_modules/.bin/jest tests/performance/memory.test.ts

# Use Chrome DevTools for analysis
# 1. Open chrome://inspect
# 2. Click "Open dedicated DevTools"
# 3. Take heap snapshots before/after operations
```

#### Custom Performance Measurement
```typescript
import { PerformanceTimer } from './tests/performance/utils/timer';

// Measure specific operations
const result = PerformanceTimer.benchmark(() => {
  // Your operation here
  storage.setPluginData('key', largeData);
}, { iterations: 20, warmup: 5 });

console.log(PerformanceTimer.formatResult(result));

// Expected output:
// Performance Results:
//   Mean:   95ms
//   Median: 94ms
//   P95:    105ms
//   Samples: 20
```

## Best Practices for Performance

### Development Workflow
1. **Run performance tests regularly**: `npm run test:performance:quick`
2. **Monitor critical paths**: Focus on compression and chunking operations
3. **Use TDD for performance**: Write performance tests before optimizations
4. **Profile before optimizing**: Measure actual bottlenecks, not assumptions

### Data Design for Performance
```typescript
// ✅ Good: Structured data with patterns
const efficientData = {
  users: Array(100).fill(null).map((_, i) => ({
    id: `user_${i}`,
    role: 'editor',  // Repeated value compresses well
    preferences: defaultPreferences  // Shared reference
  }))
};

// ❌ Avoid: Random or highly variable data
const inefficientData = {
  entropy: crypto.randomUUID().repeat(1000),
  randomValues: Array(100).fill(null).map(() => Math.random())
};
```

### Production Monitoring
```typescript
// Add performance monitoring in production
const startTime = performance.now();
try {
  storage.setPluginData('key', data);
  const duration = performance.now() - startTime;
  
  // Log slow operations
  if (duration > 100) {
    console.warn(`Slow storage operation: ${duration.toFixed(2)}ms`);
  }
  
  // Track metrics
  analytics.track('storage_operation', {
    duration,
    dataSize: JSON.stringify(data).length,
    compressed: true
  });
} catch (error) {
  analytics.track('storage_error', { error: error.message });
  throw error;
}
```

## Performance Testing Reference

### Test File Structure
```
tests/performance/
├── benchmark.test.ts      # Core speed tests
├── compression.test.ts    # Compression ratio tests
├── memory.test.ts         # Memory leak detection
├── scenarios.test.ts      # Real-world workflows
├── comparison.test.ts     # figjar vs native API
└── utils/
    ├── timer.ts          # Performance measurement
    ├── memory-monitor.ts # Memory tracking
    └── data-generators.ts # Test data creation
```

### Key Test Categories

1. **Benchmark Tests**: Core operation speed validation
2. **Compression Tests**: Ratio and speed verification  
3. **Memory Tests**: Leak detection and overhead analysis
4. **Scenario Tests**: Real-world usage patterns
5. **Comparison Tests**: Performance vs native Figma API

### Performance Utilities

- **PerformanceTimer**: High-precision benchmarking with statistics
- **MemoryMonitor**: Memory usage tracking and leak detection
- **DataGenerator**: Realistic test data with compression patterns

This comprehensive monitoring approach ensures figjar maintains its performance promises while providing early detection of any regressions during development.