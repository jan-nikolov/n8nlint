import type { RuleViolation } from '../types/rule.js';

export interface FileResult {
  filePath: string;
  violations: RuleViolation[];
  skipped?: boolean;
  skipReason?: string;
}

export interface Reporter {
  format(results: FileResult[]): string;
}
