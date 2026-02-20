import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../fixtures');
const cliPath = resolve(__dirname, '../../src/cli.ts');

function runCli(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('npx', ['tsx', cliPath, ...args], {
      cwd: resolve(__dirname, '../..'),
      encoding: 'utf-8',
      timeout: 10000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', exitCode: err.status ?? 1 };
  }
}

describe('CLI integration', () => {
  it('should exit 1 for workflows with errors', () => {
    const result = runCli([resolve(fixturesDir, 'merge-in-loop-bad.json')]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('no-merge-in-loop');
  });

  it('should exit 0 for clean workflows', () => {
    const result = runCli([resolve(fixturesDir, 'merge-in-loop-clean.json')]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No problems found');
  });

  it('should support JSON output format', () => {
    const result = runCli([
      '--format', 'json',
      resolve(fixturesDir, 'merge-in-loop-bad.json'),
    ]);
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].violations.length).toBeGreaterThan(0);
  });

  it('should skip non-n8n JSON files', () => {
    const result = runCli([
      '--format', 'json',
      resolve(fixturesDir, '..', '..', 'package.json'),
    ]);
    const parsed = JSON.parse(result.stdout);
    expect(parsed[0].skipped).toBe(true);
    expect(parsed[0].skipReason).toBe('not an n8n workflow');
  });

  it('should lint multiple files via glob', () => {
    const result = runCli([
      '--format', 'json',
      resolve(fixturesDir, '*.json'),
    ]);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.length).toBeGreaterThan(1);
  });
});
