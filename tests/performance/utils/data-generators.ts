export interface TestDataOptions {
  seed?: number;
}

export class DataGenerator {
  private seed: number;
  
  constructor(options: TestDataOptions = {}) {
    this.seed = options.seed || Date.now();
  }

  // Simple pseudo-random number generator for consistent test data
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(this.random() * chars.length));
    }
    return result;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Generate small JSON objects (1KB - 50KB)
  generateSmallJSON(targetSizeKB: number): any {
    const targetSize = targetSizeKB * 1024;
    const baseObject = {
      id: this.randomString(16),
      timestamp: Date.now(),
      type: 'small',
      data: {} as Record<string, any>
    };

    // Add fields until we reach target size
    let currentSize = JSON.stringify(baseObject).length;
    let fieldCount = 0;

    while (currentSize < targetSize) {
      const fieldName = `field_${fieldCount++}`;
      const remainingSize = targetSize - currentSize;
      
      if (remainingSize < 100) {
        // Fill with exact size string
        baseObject.data[fieldName] = this.randomString(remainingSize - 20);
      } else {
        // Add structured data
        baseObject.data[fieldName] = {
          value: this.randomString(50),
          number: this.randomInt(1, 1000),
          boolean: this.random() > 0.5,
          array: Array(5).fill(null).map(() => this.randomString(10))
        };
      }
      
      currentSize = JSON.stringify(baseObject).length;
    }

    return baseObject;
  }

  // Generate large JSON objects (1MB - 5MB)
  generateLargeJSON(targetSizeMB: number): any {
    const targetSize = targetSizeMB * 1024 * 1024;
    const baseObject = {
      id: this.randomString(16),
      timestamp: Date.now(),
      type: 'large',
      components: [] as any[]
    };

    // Generate component-like structures
    let currentSize = JSON.stringify(baseObject).length;
    
    while (currentSize < targetSize) {
      const component = {
        id: this.randomString(16),
        name: `Component_${baseObject.components.length}`,
        props: {} as Record<string, any>,
        styles: {} as Record<string, any>,
        children: [] as any[]
      };

      // Add properties
      for (let i = 0; i < 20; i++) {
        component.props[`prop_${i}`] = this.randomString(20);
        component.styles[`style_${i}`] = this.randomString(15);
      }

      // Add nested children
      for (let i = 0; i < 5; i++) {
        component.children.push({
          id: this.randomString(16),
          type: 'child',
          data: this.randomString(100)
        });
      }

      baseObject.components.push(component);
      currentSize = JSON.stringify(baseObject).length;
    }

    return baseObject;
  }

  // Generate highly compressible data (repeated patterns)
  generateRepetitiveData(sizeKB: number): any {
    const pattern = {
      type: 'button',
      props: {
        color: 'primary',
        size: 'medium',
        disabled: false,
        text: 'Click me'
      }
    };

    const count = Math.floor((sizeKB * 1024) / JSON.stringify(pattern).length);
    return {
      id: this.randomString(16),
      timestamp: Date.now(),
      type: 'repetitive',
      items: Array(count).fill(pattern)
    };
  }

  // Generate low-compressibility data (random)
  generateRandomData(sizeKB: number): any {
    const targetSize = sizeKB * 1024;
    const data = {
      id: this.randomString(16),
      timestamp: Date.now(),
      type: 'random',
      entropy: this.randomString(targetSize - 100)
    };
    return data;
  }

  // Generate real-world like plugin data
  generatePluginData(type: 'settings' | 'components' | 'tokens' | 'state'): any {
    switch (type) {
      case 'settings':
        // Create larger, more realistic settings with natural redundancy
        return {
          version: '2.0.0',
          users: Array(10).fill(null).map((_, i) => ({
            id: `user_${i}`,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            preferences: {
              theme: 'dark',
              language: 'en',
              autoSave: true,
              showGrid: true,
              snapToPixel: true,
              smartGuides: true,
              notifications: {
                email: true,
                inApp: true,
                push: false,
                digest: 'daily',
                mentions: true,
                updates: true
              },
              shortcuts: {
                save: 'Cmd+S',
                undo: 'Cmd+Z',
                redo: 'Cmd+Shift+Z',
                copy: 'Cmd+C',
                paste: 'Cmd+V',
                duplicate: 'Cmd+D',
                delete: 'Delete',
                selectAll: 'Cmd+A'
              }
            },
            workspaces: Array(5).fill(null).map((_, j) => ({
              id: `workspace_${i}_${j}`,
              name: `Workspace ${j}`,
              role: 'editor',
              permissions: {
                canEdit: true,
                canComment: true,
                canShare: true,
                canExport: true,
                canDelete: false,
                canManageUsers: false
              },
              settings: {
                defaultFont: 'Inter',
                defaultFontSize: 14,
                gridSize: 8,
                snapToGrid: true,
                units: 'px',
                colorSpace: 'sRGB',
                imageQuality: 'high'
              }
            }))
          })),
          globalSettings: {
            organization: {
              name: 'Test Organization',
              plan: 'professional',
              seats: 50,
              usage: {
                storage: 1024 * 1024 * 100, // 100MB
                projects: 25,
                members: 35
              }
            },
            integrations: {
              slack: { enabled: true, webhook: 'https://hooks.slack.com/...', channels: ['#design', '#general'] },
              github: { enabled: true, token: 'ghs_...', repos: ['design-system', 'web-app'] },
              jira: { enabled: false, url: '', project: '' },
              figma: { enabled: true, token: 'figd_...', teamId: 'team_123' }
            },
            security: {
              twoFactorRequired: true,
              sessionTimeout: 3600,
              ipWhitelist: [],
              passwordPolicy: {
                minLength: 12,
                requireUppercase: true,
                requireNumbers: true,
                requireSymbols: true,
                expiryDays: 90
              }
            }
          }
        };

      case 'components':
        const components = [];
        for (let i = 0; i < 50; i++) {
          components.push({
            id: this.randomString(16),
            name: `Component_${i}`,
            type: ['button', 'input', 'card', 'modal'][this.randomInt(0, 3)],
            variants: Array(3).fill(null).map(() => ({
              name: this.randomString(10),
              props: {
                color: ['primary', 'secondary', 'danger'][this.randomInt(0, 2)],
                size: ['small', 'medium', 'large'][this.randomInt(0, 2)]
              }
            }))
          });
        }
        return { components };

      case 'tokens':
        // Create a more comprehensive token system with natural redundancy
        const colorShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        const colorNames = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'];
        const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
        
        const tokens: any = {
          version: '1.0.0',
          colors: {} as Record<string, any>,
          spacing: {} as Record<string, any>,
          typography: {
            fonts: {} as Record<string, any>,
            sizes: {} as Record<string, any>,
            weights: {} as Record<string, any>,
            lineHeights: {} as Record<string, any>
          },
          shadows: {} as Record<string, any>,
          borders: {} as Record<string, any>,
          animations: {} as Record<string, any>
        };
        
        // Generate color tokens with consistent patterns
        colorNames.forEach(name => {
          tokens.colors[name] = {} as Record<string, any>;
          colorShades.forEach(shade => {
            // Use a pattern that compresses well
            const baseValue = name === 'primary' ? 33 : name === 'secondary' ? 156 : 200;
            const value = (baseValue + shade / 10) % 255;
            tokens.colors[name][shade] = {
              hex: `#${value.toString(16).padStart(2, '0')}${value.toString(16).padStart(2, '0')}${value.toString(16).padStart(2, '0')}`,
              rgb: `rgb(${value}, ${value}, ${value})`,
              hsl: `hsl(${value}, 50%, 50%)`
            };
          });
        });
        
        // Generate spacing tokens with mathematical relationships
        sizes.forEach((size, i) => {
          const baseValue = 4 * Math.pow(1.5, i);
          tokens.spacing[size] = {
            value: `${Math.round(baseValue)}px`,
            rem: `${(baseValue / 16).toFixed(3)}rem`,
            description: `Spacing ${size}`
          };
        });
        
        // Generate typography tokens
        ['sans', 'serif', 'mono', 'display'].forEach(family => {
          tokens.typography.fonts[family] = {
            family: `${family === 'sans' ? 'Inter' : family === 'serif' ? 'Georgia' : family === 'mono' ? 'Monaco' : 'Playfair Display'}, ${family}`,
            fallback: family === 'mono' ? 'monospace' : family,
            weights: [300, 400, 500, 600, 700]
          };
        });
        
        sizes.forEach((size, i) => {
          const baseSize = 12 + i * 2;
          tokens.typography.sizes[size] = {
            desktop: `${baseSize}px`,
            tablet: `${baseSize - 1}px`,
            mobile: `${baseSize - 2}px`,
            lineHeight: `${baseSize * 1.5}px`
          };
        });
        
        // Add shadow tokens
        ['sm', 'md', 'lg', 'xl'].forEach((size, i) => {
          const offset = 2 * Math.pow(2, i);
          tokens.shadows[size] = {
            default: `0 ${offset}px ${offset * 2}px rgba(0, 0, 0, 0.1)`,
            dark: `0 ${offset}px ${offset * 2}px rgba(0, 0, 0, 0.2)`,
            colored: `0 ${offset}px ${offset * 2}px rgba(59, 130, 246, 0.15)`
          };
        });
        
        return tokens;

      case 'state':
        // Create more structured state data with patterns
        const nodeTypes = ['frame', 'component', 'text', 'rectangle', 'group'];
        const baseTimestamp = Date.now();
        
        return {
          version: '2.0.0',
          session: {
            id: 'session_12345',
            startTime: baseTimestamp,
            lastActivity: baseTimestamp + 1000,
            duration: 1000
          },
          selection: Array(20).fill(null).map((_, i) => ({
            nodeId: `node_${i}`,
            type: nodeTypes[i % nodeTypes.length],
            name: `Layer ${i}`,
            selected: i < 5,
            visible: true,
            locked: false
          })),
          viewport: {
            x: 0,
            y: 0,
            zoom: 1.0,
            center: { x: 500, y: 500 },
            bounds: { 
              top: -1000, 
              left: -1000, 
              bottom: 2000, 
              right: 2000,
              width: 3000,
              height: 3000
            }
          },
          history: {
            undo: Array(50).fill(null).map((_, i) => ({
              id: `action_${i}`,
              action: nodeTypes[i % 3] === 'frame' ? 'create' : nodeTypes[i % 3] === 'component' ? 'update' : 'delete',
              nodeId: `node_${i % 10}`,
              nodeType: nodeTypes[i % nodeTypes.length],
              timestamp: baseTimestamp - (50 - i) * 1000,
              user: `user_${i % 3}`,
              changes: {
                before: { x: 0, y: 0, width: 100, height: 100 },
                after: { x: 10, y: 10, width: 110, height: 110 }
              }
            })),
            redo: [],
            maxSize: 100,
            currentIndex: 50
          },
          activeDocument: {
            id: 'doc_main',
            name: 'Main Design File',
            pages: Array(5).fill(null).map((_, i) => ({
              id: `page_${i}`,
              name: `Page ${i + 1}`,
              selected: i === 0
            }))
          },
          ui: {
            panels: {
              layers: { open: true, width: 240, collapsed: false },
              properties: { open: true, width: 240, collapsed: false },
              assets: { open: true, width: 240, collapsed: false },
              components: { open: false, width: 240, collapsed: true }
            },
            theme: 'light',
            zoom: 100,
            rulers: true,
            grid: true,
            guides: true
          }
        };
    }
  }

  // Generate mixed content that represents typical plugin usage
  generateMixedContent(totalSizeKB: number): any {
    return {
      settings: this.generatePluginData('settings'),
      components: this.generatePluginData('components'),
      tokens: this.generatePluginData('tokens'),
      state: this.generatePluginData('state'),
      customData: this.generateSmallJSON(Math.max(1, totalSizeKB - 50))
    };
  }

  // Generate data with specific characteristics for compression testing
  generateCompressionTestData(type: 'best' | 'average' | 'worst', sizeKB: number): any {
    switch (type) {
      case 'best':
        // Highly repetitive data - should compress very well
        return this.generateRepetitiveData(sizeKB);
      
      case 'average':
        // Typical JSON structure - moderate compression
        return this.generateMixedContent(sizeKB);
      
      case 'worst':
        // Random data - poor compression
        return this.generateRandomData(sizeKB);
    }
  }
}