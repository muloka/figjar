export interface QuotaReport {
  totalUsed: number;
  totalAvailable: number;
  remainingBytes: number;
  utilizationPercent: number;
  nodeBreakdown: Map<string, number>;
  keyBreakdown: Map<string, Map<string, number>>;
}

export interface OptimizationResult {
  bytesSaved: number;
  operationsPerformed: number;
  keysOptimized: string[];
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  discrepancies: Array<{
    nodeId: string;
    key: string;
    trackedSize: number;
    actualSize: number;
  }>;
  totalDiscrepancy: number;
}

export class GlobalQuotaManager {
  private static readonly MAX_TOTAL_QUOTA = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_ENTRY_SIZE = 100 * 1024; // 100KB
  
  // Structure: nodeId -> (key -> bytes)
  private static usage: Map<string, Map<string, number>> = new Map();

  // Core quota management
  static getCurrentUsage(): number {
    let total = 0;
    for (const nodeUsage of this.usage.values()) {
      for (const keyBytes of nodeUsage.values()) {
        total += keyBytes;
      }
    }
    return total;
  }

  static getRemainingQuota(): number {
    return this.MAX_TOTAL_QUOTA - this.getCurrentUsage();
  }

  static canStore(sizeBytes: number): boolean {
    return (this.getCurrentUsage() + sizeBytes) <= this.MAX_TOTAL_QUOTA;
  }

  // Usage tracking
  static recordUsage(nodeId: string, key: string, bytes: number): void {
    if (!this.usage.has(nodeId)) {
      this.usage.set(nodeId, new Map());
    }
    
    const nodeUsage = this.usage.get(nodeId)!;
    nodeUsage.set(key, bytes);
  }

  static removeUsage(nodeId: string, key: string): void {
    const nodeUsage = this.usage.get(nodeId);
    if (nodeUsage) {
      nodeUsage.delete(key);
      
      // Clean up empty node entries
      if (nodeUsage.size === 0) {
        this.usage.delete(nodeId);
      }
    }
  }

  static updateUsage(nodeId: string, key: string, oldBytes: number, newBytes: number): void {
    this.recordUsage(nodeId, key, newBytes);
  }

  // Entry size validation
  static validateEntrySize(key: string, value: string): void {
    const entrySize = key.length + value.length;
    if (entrySize > this.MAX_ENTRY_SIZE) {
      // Import proper error class dynamically to avoid circular imports
      const EntryTooLargeError = require('../utils/errors').EntryTooLargeError;
      throw new EntryTooLargeError(entrySize, this.MAX_ENTRY_SIZE);
    }
  }

  // Analytics and reporting
  static getUsageReport(): QuotaReport {
    const totalUsed = this.getCurrentUsage();
    const remainingBytes = this.getRemainingQuota();
    const utilizationPercent = (totalUsed / this.MAX_TOTAL_QUOTA) * 100;

    // Create deep copies for the report
    const nodeBreakdown = new Map<string, number>();
    const keyBreakdown = new Map<string, Map<string, number>>();

    for (const [nodeId, nodeUsage] of this.usage) {
      let nodeTotal = 0;
      const nodeKeys = new Map<string, number>();

      for (const [key, bytes] of nodeUsage) {
        nodeTotal += bytes;
        nodeKeys.set(key, bytes);
      }

      nodeBreakdown.set(nodeId, nodeTotal);
      keyBreakdown.set(nodeId, nodeKeys);
    }

    return {
      totalUsed,
      totalAvailable: this.MAX_TOTAL_QUOTA,
      remainingBytes,
      utilizationPercent,
      nodeBreakdown,
      keyBreakdown
    };
  }

  static getNodeUsage(nodeId: string): number {
    const nodeUsage = this.usage.get(nodeId);
    if (!nodeUsage) return 0;

    let total = 0;
    for (const bytes of nodeUsage.values()) {
      total += bytes;
    }
    return total;
  }

  static getKeyUsage(nodeId: string, key: string): number {
    const nodeUsage = this.usage.get(nodeId);
    return nodeUsage?.get(key) || 0;
  }

  // Memory management
  static cleanupNode(nodeId: string): void {
    this.usage.delete(nodeId);
  }

  static getQuotaStats(): { used: number; available: number; remaining: number; utilizationPercent: number } {
    const used = this.getCurrentUsage();
    const remaining = this.getRemainingQuota();
    
    return {
      used,
      available: this.MAX_TOTAL_QUOTA,
      remaining,
      utilizationPercent: (used / this.MAX_TOTAL_QUOTA) * 100
    };
  }

  // Utility methods
  static reset(): void {
    this.usage.clear();
  }

  static getMaxEntrySize(): number {
    return this.MAX_ENTRY_SIZE;
  }

  static getMaxTotalQuota(): number {
    return this.MAX_TOTAL_QUOTA;
  }
}