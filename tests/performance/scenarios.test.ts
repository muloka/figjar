import { PluginData } from '../../src/PluginData';
import { createMockNode } from '../mocks/figma.mock';
import { GlobalQuotaManager } from '../../src/core/GlobalQuotaManager';
import { PerformanceTimer } from './utils/timer';
import { MemoryMonitor } from './utils/memory-monitor';
import { DataGenerator } from './utils/data-generators';

describe('Real-World Scenarios', () => {
  let generator: DataGenerator;
  
  beforeEach(() => {
    GlobalQuotaManager.reset();
    generator = new DataGenerator({ seed: 12345 });
  });

  describe('User Settings Workflow', () => {
    it('should handle frequent small updates efficiently', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Initial settings
      let settings = generator.generatePluginData('settings');
      storage.setPluginData('user_settings', settings);
      
      // Simulate frequent preference updates
      const updateOperations = [
        () => { settings.users[0].preferences.theme = 'light'; },
        () => { settings.users[0].preferences.autoSave = false; },
        () => { settings.users[0].workspaces[0].settings.gridSize = 16; },
        () => { settings.users[0].preferences.notifications.email = false; },
        () => { settings.users[0].workspaces[0].settings.snapToGrid = false; }
      ];
      
      console.log('\n=== User Settings Update Performance ===');
      
      const results = updateOperations.map((update, index) => {
        const result = PerformanceTimer.benchmark(() => {
          update();
          storage.setPluginData('user_settings', settings);
          storage.getPluginData('user_settings');
        }, { iterations: 50, warmup: 10 });
        
        console.log(`Update ${index + 1}: median ${result.median.toFixed(2)}ms, p95 ${result.p95.toFixed(2)}ms`);
        
        return result;
      });
      
      // All updates should be fast
      for (const result of results) {
        expect(result.median).toBeLessThan(20);
      }
    });

    it('should handle settings migration efficiently', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Simulate old settings format
      const oldSettings = {
        theme: 'dark',
        autoSave: true,
        gridSize: 8
      };
      
      // Store in native format (simulating migration scenario)
      mockNode.setPluginData('settings_v1', JSON.stringify(oldSettings));
      
      const migrationResult = PerformanceTimer.measure(() => {
        // Read old settings
        const oldData = mockNode.getPluginData('settings_v1');
        const parsed = JSON.parse(oldData);
        
        // Transform to new format
        const newSettings = {
          version: '2.0.0',
          user: {
            preferences: {
              theme: parsed.theme,
              autoSave: parsed.autoSave
            }
          },
          workspace: {
            settings: {
              gridSize: parsed.gridSize
            }
          }
        };
        
        // Store in figjar format
        storage.setPluginData('user_settings', newSettings);
        
        // Clean up old data
        mockNode.setPluginData('settings_v1', '');
      });
      
      console.log('\n=== Settings Migration ===');
      console.log(`Migration time: ${migrationResult.timing.duration.toFixed(2)}${migrationResult.timing.unit}`);
      
      expect(migrationResult.timing.duration).toBeLessThan(150); // More realistic for complex migration
    });
  });

  describe('Component Library Management', () => {
    it('should handle bulk component operations', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Generate component library
      const componentLibrary = generator.generatePluginData('components');
      
      console.log('\n=== Component Library Operations ===');
      
      // Bulk import
      const importResult = PerformanceTimer.measure(() => {
        storage.setPluginData('component_library', componentLibrary);
      });
      console.log(`Import ${componentLibrary.components.length} components: ${importResult.timing.duration.toFixed(2)}ms`);
      
      // Search operations
      const searchResult = PerformanceTimer.benchmark(() => {
        const library = storage.getPluginData('component_library') as any;
        // Simulate searching for button components
        library.components.filter((c: any) => c.type === 'button');
      }, { iterations: 30, warmup: 5 });
      console.log(`Search operations: median ${searchResult.median.toFixed(2)}ms`);
      
      // Update multiple components
      const updateResult = PerformanceTimer.measure(() => {
        const library = storage.getPluginData('component_library') as any;
        // Update first 10 components
        for (let i = 0; i < 10; i++) {
          library.components[i].lastModified = Date.now();
        }
        storage.setPluginData('component_library', library);
      });
      console.log(`Update 10 components: ${updateResult.timing.duration.toFixed(2)}ms`);
      
      expect(importResult.timing.duration).toBeLessThan(600); // More realistic for bulk import
      expect(searchResult.median).toBeLessThan(50);
      expect(updateResult.timing.duration).toBeLessThan(600); // More realistic for bulk update
    });

    it('should handle component library growth over time', async () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      const monitor = new MemoryMonitor();
      
      monitor.start();
      
      // Start with empty library
      let library: { components: any[], version: string } = { components: [], version: '1.0.0' };
      storage.setPluginData('growing_library', library);
      
      console.log('\n=== Library Growth Simulation ===');
      
      // Simulate adding components over time
      const growthSteps = 10;
      const componentsPerStep = 5;
      
      for (let step = 0; step < growthSteps; step++) {
        // Add new components
        const newComponents = Array(componentsPerStep).fill(null).map((_, i) => ({
          id: generator.randomString(16),
          name: `Component_${step}_${i}`,
          type: 'custom',
          props: generator.generateSmallJSON(1)
        }));
        
        library.components.push(...newComponents);
        
        const { timing } = PerformanceTimer.measure(() => {
          storage.setPluginData('growing_library', library);
        });
        
        if (step % 2 === 0) {
          monitor.snapshot();
          console.log(`Step ${step + 1}: ${library.components.length} components, save time: ${timing.duration.toFixed(2)}ms`);
        }
      }
      
      const analysis = monitor.analyze();
      console.log(`Memory growth: ${MemoryMonitor.formatBytes(analysis.heapGrowth)}`);
      
      // Performance should scale reasonably with size
      expect(analysis.heapGrowthPercent).toBeLessThan(200);
    });
  });

  describe('Design Token Workflow', () => {
    it('should handle token updates and lookups efficiently', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Store design tokens
      const tokens = generator.generatePluginData('tokens');
      storage.setPluginData('design_tokens', tokens);
      
      console.log('\n=== Design Token Operations ===');
      
      // Token lookup performance
      const lookupResult = PerformanceTimer.benchmark(() => {
        const tokenData = storage.getPluginData('design_tokens') as any;
        // Simulate token lookups
        const primary500 = tokenData.colors.primary['500'];
        const spacingMd = tokenData.spacing.md;
        const fontSizeLg = tokenData.typography.sizes.lg;
      }, { iterations: 100, warmup: 20 });
      
      console.log(`Token lookups: median ${lookupResult.median.toFixed(2)}ms`);
      
      // Batch token updates
      const updateResult = PerformanceTimer.measure(() => {
        const tokenData = storage.getPluginData('design_tokens') as any;
        
        // Update multiple color values
        Object.keys(tokenData.colors.primary).forEach(key => {
          // Simulate color adjustment - update hex value
          if (tokenData.colors.primary[key].hex) {
            tokenData.colors.primary[key].hex = tokenData.colors.primary[key].hex.slice(0, 7) + 'ff';
          }
        });
        
        storage.setPluginData('design_tokens', tokenData);
      });
      
      console.log(`Batch color update: ${updateResult.timing.duration.toFixed(2)}ms`);
      
      expect(lookupResult.median).toBeLessThan(10);
      expect(updateResult.timing.duration).toBeLessThan(600); // More realistic for token updates
    });
  });

  describe('Plugin State Persistence', () => {
    it('should save and restore plugin state quickly', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Generate plugin state
      const state = generator.generatePluginData('state');
      
      console.log('\n=== State Persistence ===');
      
      // Save state
      const saveResult = PerformanceTimer.benchmark(() => {
        storage.setPluginData('plugin_state', state);
      }, { iterations: 30, warmup: 5 });
      
      console.log(`Save state: median ${saveResult.median.toFixed(2)}ms`);
      
      // Restore state
      const restoreResult = PerformanceTimer.benchmark(() => {
        storage.getPluginData('plugin_state');
      }, { iterations: 30, warmup: 5 });
      
      console.log(`Restore state: median ${restoreResult.median.toFixed(2)}ms`);
      
      // State operations should be very fast
      expect(saveResult.median).toBeLessThan(20);
      expect(restoreResult.median).toBeLessThan(20);
    });

    it('should handle undo/redo history efficiently', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Initialize history
      let history: {
        undo: any[],
        redo: any[],
        maxSize: number
      } = {
        undo: [],
        redo: [],
        maxSize: 50
      };
      
      console.log('\n=== Undo/Redo Performance ===');
      
      // Simulate adding history entries
      const addHistoryResult = PerformanceTimer.benchmark(() => {
        // Add new action
        history.undo.push({
          action: 'modify',
          data: generator.generateSmallJSON(5),
          timestamp: Date.now()
        });
        
        // Maintain max size
        if (history.undo.length > history.maxSize) {
          history.undo.shift();
        }
        
        // Clear redo on new action
        history.redo = [];
        
        storage.setPluginData('history', history);
      }, { iterations: 50, warmup: 10 });
      
      console.log(`Add history entry: median ${addHistoryResult.median.toFixed(2)}ms`);
      
      // Simulate undo operation
      const undoResult = PerformanceTimer.benchmark(() => {
        const currentHistory = storage.getPluginData('history') as any;
        if (currentHistory.undo.length > 0) {
          const action = currentHistory.undo.pop();
          currentHistory.redo.push(action);
          storage.setPluginData('history', currentHistory);
        }
      }, { iterations: 30, warmup: 5 });
      
      console.log(`Undo operation: median ${undoResult.median.toFixed(2)}ms`);
      
      expect(addHistoryResult.median).toBeLessThan(30);
      expect(undoResult.median).toBeLessThan(30);
    });
  });

  describe('Multi-User Collaboration', () => {
    it('should handle concurrent user data efficiently', () => {
      // Simulate multiple users working on same document
      const userCount = 5;
      const users = Array(userCount).fill(null).map((_, i) => ({
        node: createMockNode(),
        storage: null as PluginData | null,
        id: `user_${i}`
      }));
      
      // Initialize storage for each user
      users.forEach(user => {
        user.storage = new PluginData(user.node);
      });
      
      console.log('\n=== Multi-User Simulation ===');
      
      // Each user stores their own data
      const storeResult = PerformanceTimer.benchmark(() => {
        users.forEach(user => {
          const userData = {
            userId: user.id,
            cursor: { x: Math.random() * 1000, y: Math.random() * 1000 },
            selection: Array(3).fill(null).map(() => generator.randomString(16)),
            timestamp: Date.now()
          };
          user.storage!.setPluginData('user_data', userData);
        });
      }, { iterations: 20, warmup: 5 });
      
      console.log(`${userCount} users storing data: median ${storeResult.median.toFixed(2)}ms`);
      
      // Simulate reading other users' data
      const readResult = PerformanceTimer.benchmark(() => {
        users.forEach(user => {
          // Read own data
          user.storage!.getPluginData('user_data');
          // Simulate reading shared data
          user.storage!.getPluginData('shared_components');
        });
      }, { iterations: 30, warmup: 5 });
      
      console.log(`${userCount} users reading data: median ${readResult.median.toFixed(2)}ms`);
      
      // Performance should scale linearly
      expect(storeResult.median).toBeLessThan(userCount * 10);
      expect(readResult.median).toBeLessThan(userCount * 10);
    });
  });

  describe('Import/Export Operations', () => {
    it('should handle large data exports efficiently', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Store various types of data
      storage.setPluginData('components', generator.generatePluginData('components'));
      storage.setPluginData('tokens', generator.generatePluginData('tokens'));
      storage.setPluginData('settings', generator.generatePluginData('settings'));
      storage.setPluginData('custom_data', generator.generateLargeJSON(0.5));
      
      console.log('\n=== Export Performance ===');
      
      // Export all data
      const exportResult = PerformanceTimer.measure(() => {
        const keys = storage.getPluginDataKeys();
        const exportData: Record<string, any> = {};
        
        for (const key of keys) {
          exportData[key] = storage.getPluginData(key);
        }
        
        // Simulate creating export file
        JSON.stringify(exportData);
      });
      
      console.log(`Export all data: ${exportResult.timing.duration.toFixed(2)}ms`);
      
      expect(exportResult.timing.duration).toBeLessThan(1000); // More realistic for large export
    });

    it('should handle large data imports efficiently', () => {
      const mockNode = createMockNode();
      const storage = new PluginData(mockNode);
      
      // Prepare import data
      const importData = {
        components: generator.generatePluginData('components'),
        tokens: generator.generatePluginData('tokens'),
        settings: generator.generatePluginData('settings'),
        custom_data: generator.generateLargeJSON(0.5)
      };
      
      const importString = JSON.stringify(importData);
      
      console.log('\n=== Import Performance ===');
      console.log(`Import size: ${(importString.length / 1024).toFixed(2)}KB`);
      
      // Import all data
      const importResult = PerformanceTimer.measure(() => {
        const parsed = JSON.parse(importString);
        
        for (const [key, value] of Object.entries(parsed)) {
          storage.setPluginData(key, value);
        }
      });
      
      console.log(`Import all data: ${importResult.timing.duration.toFixed(2)}ms`);
      
      expect(importResult.timing.duration).toBeLessThan(300);
    });
  });
});