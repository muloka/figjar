export interface IMigrationResult {
  migrated: string[];
  failed: string[];
  skipped: string[];
}

export interface BaseNode {
  id: string;
  type: string;
  name: string;
  setPluginData(key: string, value: string): void;
  getPluginData(key: string): string;
  getPluginDataKeys(): string[];
}

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