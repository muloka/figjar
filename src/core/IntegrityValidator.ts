export class IntegrityValidator {
  calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  validate(data: string, expectedChecksum: string): boolean {
    return this.calculateChecksum(data) === expectedChecksum;
  }
}