import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { N8nLintConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from './defaults.js';

const CONFIG_FILENAMES = ['.n8nlintrc.yml', '.n8nlintrc.yaml', '.n8nlintrc.json'];

/**
 * Search for a config file starting from `dir` and walking up to root.
 */
function findConfigFile(dir: string): string | null {
  let current = resolve(dir);
  const root = resolve('/');

  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = resolve(current, filename);
      if (existsSync(candidate)) return candidate;
    }
    const parent = resolve(current, '..');
    if (parent === current || current === root) break;
    current = parent;
  }

  return null;
}

/**
 * Load and merge config. Returns DEFAULT_CONFIG if no config file found.
 */
export function loadConfig(dir: string): N8nLintConfig {
  const configPath = findConfigFile(dir);
  if (!configPath) return { ...DEFAULT_CONFIG };

  const raw = readFileSync(configPath, 'utf-8');
  let userConfig: Partial<N8nLintConfig>;

  if (configPath.endsWith('.json')) {
    userConfig = JSON.parse(raw);
  } else {
    userConfig = parseYaml(raw) ?? {};
  }

  return {
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...userConfig.rules,
    },
  };
}
