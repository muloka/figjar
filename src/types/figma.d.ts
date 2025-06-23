declare global {
  interface BaseNode {
    id: string;
    type: string;
    name: string;
    setPluginData(key: string, value: string): void;
    getPluginData(key: string): string;
    getPluginDataKeys(): string[];
  }
}

export {};