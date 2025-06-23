# Claude Code Developer Guide for figjar

## Overview
This document provides guidelines for working with figjar - a mature library that maximizes Figma's 5MB plugin storage quota through intelligent compression and chunking with zero configuration.

## Project Architecture

### Core Components
- **PluginData**: Main API class providing drop-in replacement for native Figma storage
- **Compressor**: Handles data compression/decompression using fflate
- **ChunkManager**: Splits large data into 85KB chunks for storage
- **GlobalQuotaManager**: Tracks usage across all nodes to prevent exceeding 5MB limit
- **IntegrityValidator**: Ensures data integrity with checksums
- **UTF16SafeEncoder**: Handles safe encoding for all Unicode characters

### Key Design Decisions
- Zero configuration required - works out of the box
- Automatic compression using gzip (via fflate)
- Intelligent chunking when compressed data exceeds 85KB
- Global quota tracking across all nodes and keys
- Type-safe API with full TypeScript support
- Drop-in replacement for native `setPluginData`/`getPluginData`

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Run development build (watches for changes)
npm run dev

# Run tests
npm test

# Run performance benchmarks
npm run test:performance
```

### Testing
The project has comprehensive test coverage including:
- Unit tests for all core components
- Integration tests for the main API
- Performance benchmarks validating < 50ms for small data, < 500ms for large data
- Memory leak detection tests
- Real-world usage scenario tests

### Building
```bash
# Production build (creates both CJS and ESM bundles)
npm run build

# Clean build
npm run build:clean
```

## Development Approaches

### Test-Driven Development (Recommended)

For new features and bug fixes that can be verified with tests, use this TDD workflow to leverage Claude's iterative capabilities:

#### Step 1: Write Tests First
```
Write tests for [feature/function] based on these input/output pairs:
- Input: [example input]
- Expected output: [example output]

This is test-driven development - don't implement the functionality yet, just write comprehensive tests that would verify the correct behavior.
```

#### Step 2: Verify Test Failures
```
Run these tests and confirm they fail as expected. Don't write any implementation code yet - just run the tests and show me the failure output.
```

#### Step 3: Commit Tests
```
Commit these tests with an appropriate commit message.
```

#### Step 4: Implement Code
```
Now write code that passes all the tests. Don't modify the tests themselves. Keep iterating - run tests, adjust code, run tests again - until all tests pass.

Optional: Verify with independent analysis that the implementation isn't overfitting to the tests.
```

#### Step 5: Commit Implementation
```
Commit the working code once all tests pass.
```

**TDD Principles for figjar:**
- **Be explicit about TDD**: Tell Claude you're doing test-driven development to prevent mock implementations
- **Separate concerns**: Keep test writing and implementation as distinct steps
- **Iterate to success**: Let Claude run tests multiple times and adjust code incrementally
- **Provide clear targets**: Tests give Claude concrete success criteria to work toward

**When to Use TDD:**
- Adding new methods to PluginData API
- Implementing compression optimizations
- Creating new error handling scenarios
- Adding data validation features
- Fixing reproducible bugs

### Traditional Development

For exploratory work, architectural changes, or when test requirements aren't clear upfront, use the traditional approach.

## Common Development Tasks

### Adding New Features
1. **If testable**: Use TDD workflow above
2. **If exploratory**: Start with research and prototyping
3. Check if it aligns with zero-config philosophy
4. Consider performance implications (use benchmarks)
5. Ensure backward compatibility
6. Add comprehensive tests (if not using TDD)
7. Update TypeScript types
8. Document in JSDoc comments

### Fixing Bugs
1. **For reproducible bugs**: Use TDD workflow
2. **For complex debugging**: Traditional investigation approach
3. Write a failing test that reproduces the issue (if not already done)
4. Fix the bug with minimal code changes
5. Ensure all existing tests still pass
6. Run performance benchmarks to check for regressions
7. Consider edge cases

### Performance Optimization
1. Run current benchmarks to establish baseline
2. Use the performance testing utilities in `tests/performance/utils/`
3. **For algorithmic changes**: Consider TDD with performance tests
4. Focus on the critical path (compression/decompression, chunking)
5. Validate improvements with benchmarks
6. Ensure memory usage remains stable

### Writing Tests
```typescript
// Example test structure
import { PluginData } from '../src/PluginData';
import { createMockNode } from './mocks/figma.mock';

describe('Feature', () => {
  let storage: PluginData;
  
  beforeEach(() => {
    GlobalQuotaManager.reset();
    storage = new PluginData(createMockNode());
  });
  
  it('should handle specific case', () => {
    // Test implementation
  });
});
```

**TDD Test Writing Tips:**
- Focus on behavior, not implementation details
- Include edge cases from the start
- Write tests that will fail meaningfully
- Use descriptive test names that explain the expected behavior
- Include performance tests for critical operations

## Code Standards

### TypeScript Conventions
- Strict mode enabled
- Explicit return types for public methods
- Proper error types (not generic Error)
- Use generics for type safety

### Error Handling
The project defines 6 specific error types:
- `DataTooLargeError`: Data exceeds 5MB before compression
- `QuotaExceededError`: Would exceed 5MB total quota
- `EntryTooLargeError`: Single entry exceeds 100KB Figma limit
- `DataCorruptedError`: Checksum validation failed
- `InvalidKeyError`: Invalid key format
- `CompressionError`: Compression/decompression failed

### Testing Requirements
- Minimum 90% code coverage
- Performance tests for any performance-critical code
- Memory leak tests for operations that handle large data
- Edge case coverage (empty data, Unicode, max sizes)
- **TDD preferred**: Write tests before implementation when possible

## Performance Characteristics

*Updated with validated performance results (December 2024):*

### Speed Targets (VALIDATED ✅)
- **1KB data**: 0.39ms median, 0.93ms P95
- **10KB data**: 1.43ms median, 1.89ms P95
- **50KB data**: 7.80ms median, 8.03ms P95
- **1MB data**: 94.7ms median, 105.8ms P95
- **Target met**: All operations < 200ms for 1MB, < 50ms for smaller data

### Compression Performance (VALIDATED ✅)
- **Settings data**: 92.6% compression
- **Component data**: 71.6% compression
- **Token data**: 79.4% compression
- **Repetitive data**: 97-99% compression
- **Target met**: All data types achieve > 60% compression

### Memory Usage
- **Overhead**: < 10% of data size
- **No memory leaks**: Stable over 1000+ operations
- **Efficient chunking**: Minimal memory duplication

### Compression Ratios
- **JSON data**: 60-70% compression typical
- **Repetitive data**: 80-95% compression
- **Already compressed**: Minimal expansion

## Model Selection Guidelines

### When to Use Sonnet (Default)
Use Sonnet for routine tasks that follow established patterns:

**Code Maintenance:**
- Writing unit tests for existing functionality
- **TDD for simple features**: Following established patterns
- Updating documentation and comments
- Fixing simple bugs (e.g., error messages, validation)
- Code formatting and style improvements
- Adding TypeScript type definitions
- Implementing features that follow existing patterns

**Configuration & Build:**
- Updating package.json dependencies
- Modifying rollup or Jest configuration
- Adding npm scripts
- Setting up development tools

**Simple Features:**
- Adding new error types following existing pattern
- Implementing straightforward getters/setters
- Creating basic utility functions
- Adding logging or debugging statements

### When to Switch to Opus
Use Opus for complex tasks requiring deep analysis:

**Performance Optimization:**
- Optimizing compression algorithms (e.g., tuning gzip levels)
- Analyzing and fixing performance bottlenecks
- Designing efficient chunking strategies
- Memory usage optimization
- **Complex TDD**: Performance-critical features with intricate test requirements

**Architectural Decisions:**
- Designing quota management strategies
- Planning storage optimization approaches
- Creating new core algorithms
- Refactoring major components

**Complex Debugging:**
- Debugging compression/decompression failures
- Resolving UTF-16 encoding edge cases
- Tracking down data corruption issues
- Fixing complex async operation problems

**Critical Features:**
- Implementing GlobalQuotaManager enhancements
- Designing error recovery mechanisms
- Creating data integrity validation systems
- Building migration strategies

### Quick Decision Framework

Ask yourself:
1. **Is this following an existing pattern?** → Sonnet + TDD
2. **Does this require algorithmic thinking?** → Opus
3. **Is this performance-critical?** → Opus
4. **Could this break data integrity?** → Opus
5. **Is this routine maintenance?** → Sonnet
6. **Can success be verified with tests?** → Consider TDD workflow

### Examples for figjar

**Sonnet + TDD Tasks:**
```bash
# Adding a new PluginData method
"Use TDD to implement getStorageStats() method that returns usage info"

# Simple bug fix with clear reproduction steps
"Use TDD to fix ChunkManager not handling empty arrays"

# Adding validation
"Use TDD to add key format validation to PluginData.set()"
```

**Sonnet Traditional Tasks:**
```bash
# Documentation updates
"Add JSDoc comments to PluginData methods"

# Configuration changes
"Update Jest config to include coverage for performance tests"
```

**Opus Tasks:**
```bash
# Performance optimization
"Optimize compression for JSON data with repeated patterns"

# Architectural design
"Design a caching layer for frequently accessed data"

# Complex debugging
"Debug why large Unicode strings cause compression failures"
```

### Switching Mid-Task
Start with Sonnet, but switch to Opus if you encounter:
- Unexpected complexity in the codebase
- Performance implications you didn't anticipate
- Security or data integrity concerns
- Need for algorithmic optimization
- **TDD tests becoming overly complex**: May indicate architectural issues

## Quick Reference

### Running Tests
```bash
npm test                    # All tests
npm run test:watch         # Watch mode (great for TDD)
npm run test:performance   # Performance benchmarks
npm run test:performance:memory  # Memory tests with GC
```

### Key Files
- `src/PluginData.ts` - Main API implementation
- `src/core/GlobalQuotaManager.ts` - Quota tracking logic
- `tests/performance/` - Performance test suite
- `tests/integration/` - Integration tests

### Performance Utilities
Located in `tests/performance/utils/`:
- `timer.ts` - High-precision timing
- `memory-monitor.ts` - Memory leak detection
- `data-generators.ts` - Test data generation

## Common Issues

### Compression Failures
- Check data size isn't exceeding 5MB pre-compression
- Verify data is serializable (no circular references)
- Ensure proper UTF-16 encoding for special characters

### Quota Exceeded
- Use `getQuotaStats()` to check current usage
- Consider `optimizeStorage()` to re-compress data
- Clean up unused keys with `deletePluginData()`

### Performance Issues
- Run benchmarks to identify bottlenecks
- Check if data is being chunked unnecessarily
- Verify compression level is appropriate

### TDD Workflow Issues
- **Tests passing too easily**: May indicate tests aren't comprehensive enough
- **Implementation getting complex**: Consider if the feature needs architectural changes (switch to Opus)
- **Tests hard to write**: May indicate unclear requirements or design issues

## Performance Monitoring

### Continuous Performance Testing
The project includes comprehensive performance testing infrastructure:

```bash
# Run full performance validation
npm run test:performance

# Memory leak testing with garbage collection
npm run test:performance:memory

# Watch mode for development
npm run test:watch
```

### Performance Test Categories
1. **Benchmark Tests** (`tests/performance/benchmark.test.ts`)
   - Small data operations (1KB-50KB): Target < 50ms
   - Large data operations (1MB+): Target < 200ms
   - Chunking performance and scaling

2. **Compression Tests** (`tests/performance/compression.test.ts`)
   - Compression ratios for different data types
   - Compression/decompression speed
   - Base64 encoding overhead

3. **Memory Tests** (`tests/performance/memory.test.ts`)
   - Memory leak detection over 100+ operations
   - Memory overhead analysis (< 10% target)
   - Concurrent operations stability

4. **Real-World Scenarios** (`tests/performance/scenarios.test.ts`)
   - User settings workflows
   - Component library operations
   - Token management
   - Import/export operations

5. **API Comparisons** (`tests/performance/comparison.test.ts`)
   - figjar vs native Figma API performance
   - Storage capacity comparisons
   - Feature advantage demonstrations

### Performance Utilities
Located in `tests/performance/utils/`:

- **PerformanceTimer**: High-precision benchmarking with statistical analysis
- **MemoryMonitor**: Memory leak detection and heap analysis
- **DataGenerator**: Realistic test data generation with compression patterns

### Regression Detection
Monitor these key metrics for regressions:
- Small data operations should remain < 10ms median
- 1MB operations should remain < 200ms median  
- Compression ratios should maintain > 60% for typical data
- Memory overhead should stay < 10%

## Contributing

1. **Prefer TDD**: Use test-driven development for features that can be verified with tests
2. Follow existing code patterns and conventions
3. **Run performance tests**: Ensure `npm run test:performance` passes
4. Update documentation for API changes
5. Maintain backward compatibility
6. Consider zero-config philosophy in design decisions
7. **Monitor performance**: Check for regressions in key metrics