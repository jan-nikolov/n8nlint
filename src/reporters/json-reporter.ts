import type { Reporter, FileResult } from './reporter.js';

export const jsonReporter: Reporter = {
  format(results: FileResult[]): string {
    const output = results.map((r) => ({
      filePath: r.filePath,
      skipped: r.skipped ?? false,
      skipReason: r.skipReason,
      violations: r.violations.map((v) => ({
        ruleId: v.ruleId,
        severity: v.severity,
        message: v.message,
        nodeName: v.nodeName,
        relatedNodes: v.relatedNodes,
        fix: v.fix,
      })),
    }));

    return JSON.stringify(output, null, 2);
  },
};
