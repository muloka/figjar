import { BaseNode } from '../../src/types';

export function createMockNode(): BaseNode {
  const storage = new Map<string, string>();
  let nodeUsage = 0;
  
  return {
    setPluginData(key: string, value: string): void {
      const entrySize = key.length + value.length;
      
      // Enforce 100KB entry limit per Figma API
      if (entrySize > 100 * 1024) {
        throw new Error(`Plugin data entry exceeds 100KB limit: ${entrySize} bytes`);
      }
      
      const oldValue = storage.get(key) || '';
      const oldEntrySize = key.length + oldValue.length;
      
      if (value === '') {
        storage.delete(key);
        nodeUsage -= oldEntrySize;
      } else {
        storage.set(key, value);
        nodeUsage = nodeUsage - oldEntrySize + entrySize;
      }
      
      // Simulate per-node quota limit (1MB for testing)
      if (nodeUsage > 1024 * 1024) {
        throw new Error('Mock node quota exceeded');
      }
    },
    
    getPluginData(key: string): string {
      return storage.get(key) || '';
    },
    
    getPluginDataKeys(): string[] {
      return Array.from(storage.keys());
    },
    
    // Add utility for testing
    _getMockUsage(): number {
      return nodeUsage;
    },
    
    _resetMock(): void {
      storage.clear();
      nodeUsage = 0;
    },
    
    id: 'mock-node-' + Math.random().toString(36).substr(2, 9),
    type: 'FRAME',
    name: 'Mock Node'
  } as BaseNode & { _getMockUsage(): number; _resetMock(): void };
}