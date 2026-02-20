import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runRules, getAllRules } from '../../src/engine/rule-engine.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';
import type { N8nLintConfig } from '../../src/types/config.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('rule-engine', () => {
  it('should return violations from all rules', () => {
    const workflow = loadFixture('merge-in-loop-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = runRules(graph, workflow, DEFAULT_CONFIG);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].ruleId).toBe('no-merge-in-loop');
  });

  it('should respect rule severity override from config', () => {
    const workflow = loadFixture('merge-in-loop-bad.json');
    const graph = parseWorkflow(workflow);
    const config: N8nLintConfig = {
      rules: {
        ...DEFAULT_CONFIG.rules,
        'no-merge-in-loop': 'warning',
      },
    };
    const violations = runRules(graph, workflow, config);

    expect(violations[0].severity).toBe('warning');
  });

  it('should skip rules set to off', () => {
    const workflow = loadFixture('merge-in-loop-bad.json');
    const graph = parseWorkflow(workflow);
    const config: N8nLintConfig = {
      rules: {
        'no-merge-in-loop': 'off',
        'no-dead-end-in-subworkflow': 'off',
        'no-dual-branch-convergence': 'off',
      },
    };
    const violations = runRules(graph, workflow, config);

    expect(violations).toHaveLength(0);
  });

  it('should return clean for clean workflows', () => {
    const workflow = loadFixture('merge-in-loop-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = runRules(graph, workflow, DEFAULT_CONFIG);

    expect(violations).toHaveLength(0);
  });

  it('getAllRules should return 6 rules', () => {
    const rules = getAllRules();
    expect(rules).toHaveLength(6);
    expect(rules.map((r) => r.id)).toEqual([
      'no-merge-in-loop',
      'no-dead-end-in-subworkflow',
      'no-dual-branch-convergence',
      'no-unreachable-nodes',
      'splitInBatches-missing-loop-back',
      'http-no-error-handling',
    ]);
  });
});
