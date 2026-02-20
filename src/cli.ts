#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { Command } from 'commander';
import { glob } from 'glob';
import { parseWorkflow, isN8nWorkflow } from './parser/workflow-parser.js';
import { runRules } from './engine/rule-engine.js';
import { loadConfig } from './config/config-loader.js';
import { terminalReporter } from './reporters/terminal-reporter.js';
import { jsonReporter } from './reporters/json-reporter.js';
import type { FileResult } from './reporters/reporter.js';
import type { N8nLintConfig } from './types/config.js';

const program = new Command();

program
  .name('n8nlint')
  .description('Static analysis for n8n workflows')
  .version('0.1.0')
  .argument('<patterns...>', 'Glob patterns or file paths to lint')
  .option('-f, --format <format>', 'Output format: terminal, json', 'terminal')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (patterns: string[], options: { format: string; config?: string }) => {
    // Resolve files from glob patterns
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { absolute: true });
      files.push(...matches);
    }

    // Filter to .json files only
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.error('No JSON files found matching the given patterns.');
      process.exit(1);
    }

    // Load config
    let config: N8nLintConfig;
    if (options.config) {
      const raw = readFileSync(resolve(options.config), 'utf-8');
      config = JSON.parse(raw);
    } else {
      config = loadConfig(process.cwd());
    }

    // Lint each file
    const results: FileResult[] = [];
    let hasErrors = false;

    for (const filePath of jsonFiles) {
      let data: unknown;
      try {
        const raw = readFileSync(filePath, 'utf-8');
        data = JSON.parse(raw);
      } catch {
        results.push({
          filePath: basename(filePath),
          violations: [],
          skipped: true,
          skipReason: 'invalid JSON',
        });
        continue;
      }

      if (!isN8nWorkflow(data)) {
        results.push({
          filePath: basename(filePath),
          violations: [],
          skipped: true,
          skipReason: 'not an n8n workflow',
        });
        continue;
      }

      const graph = parseWorkflow(data);
      const violations = runRules(graph, data, config);

      if (violations.some((v) => v.severity === 'error')) {
        hasErrors = true;
      }

      results.push({ filePath: basename(filePath), violations });
    }

    // Output
    const reporter = options.format === 'json' ? jsonReporter : terminalReporter;
    console.log(reporter.format(results));

    // Exit code: 1 if any errors
    process.exit(hasErrors ? 1 : 0);
  });

program.parse();
