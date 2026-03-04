import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mergeModeAmbiguity } from '../../src/rules/merge-mode-ambiguity.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('merge-mode-ambiguity', () => {
  it('should detect Merge node without explicit mode', () => {
    const workflow = loadFixture('merge-mode-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = mergeModeAmbiguity.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('merge-mode-ambiguity');
    expect(violations[0].severity).toBe('info');
    expect(violations[0].nodeName).toBe('Merge');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag Merge with explicit mode', () => {
    const workflow = loadFixture('merge-mode-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = mergeModeAmbiguity.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag non-Merge nodes', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = mergeModeAmbiguity.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Merge n8nlint-ignore', type: 'n8n-nodes-base.merge', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Merge n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = mergeModeAmbiguity.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });
});
