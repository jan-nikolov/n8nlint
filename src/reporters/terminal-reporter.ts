import chalk from 'chalk';
import type { Reporter, FileResult } from './reporter.js';
import type { Severity } from '../types/rule.js';

const SEVERITY_ICONS: Record<Severity, string> = {
  error: chalk.red('✖'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
};

const SEVERITY_COLORS: Record<Severity, (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
};

export const terminalReporter: Reporter = {
  format(results: FileResult[]): string {
    const lines: string[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;

    for (const result of results) {
      if (result.skipped) {
        lines.push(chalk.dim(`  ${result.filePath} — skipped (${result.skipReason})`));
        continue;
      }

      if (result.violations.length === 0) continue;

      lines.push('');
      lines.push(chalk.underline(result.filePath));

      for (const v of result.violations) {
        const icon = SEVERITY_ICONS[v.severity];
        const ruleColor = SEVERITY_COLORS[v.severity];
        lines.push(`  ${icon} ${v.message} ${ruleColor(v.ruleId)}`);

        if (v.fix) {
          lines.push(chalk.dim(`    💡 ${v.fix}`));
        }

        if (v.severity === 'error') totalErrors++;
        else if (v.severity === 'warning') totalWarnings++;
        else totalInfo++;
      }
    }

    if (totalErrors + totalWarnings + totalInfo === 0) {
      lines.push(chalk.green('✔ No problems found.'));
    } else {
      lines.push('');
      const parts: string[] = [];
      if (totalErrors > 0) parts.push(chalk.red(`${totalErrors} error(s)`));
      if (totalWarnings > 0) parts.push(chalk.yellow(`${totalWarnings} warning(s)`));
      if (totalInfo > 0) parts.push(chalk.blue(`${totalInfo} info(s)`));
      lines.push(parts.join(', '));
    }

    return lines.join('\n');
  },
};
