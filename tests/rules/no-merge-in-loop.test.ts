import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { noMergeInLoop } from '../../src/rules/no-merge-in-loop.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('no-merge-in-loop', () => {
  it('should detect merge node inside loop', () => {
    const workflow = loadFixture('merge-in-loop-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noMergeInLoop.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('no-merge-in-loop');
    expect(violations[0].severity).toBe('error');
    expect(violations[0].nodeName).toBe('Bad Merge');
    expect(violations[0].relatedNodes).toContain('Loop');
  });

  it('should not flag merge node outside loop', () => {
    const workflow = loadFixture('merge-in-loop-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = noMergeInLoop.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Loop', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, position: [0, 0], parameters: {} },
        { id: '2', name: 'Merge n8nlint-ignore', type: 'n8n-nodes-base.merge', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        Loop: { main: [[{ node: 'Merge n8nlint-ignore', type: 'main', index: 0 }]] },
        'Merge n8nlint-ignore': { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noMergeInLoop.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should skip when splitInBatches has n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Loop n8nlint-ignore', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, position: [0, 0], parameters: {} },
        { id: '2', name: 'Merge', type: 'n8n-nodes-base.merge', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        'Loop n8nlint-ignore': { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
        Merge: { main: [[{ node: 'Loop n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noMergeInLoop.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should not flag when no splitInBatches exists', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Merge', type: 'n8n-nodes-base.merge', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        Start: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noMergeInLoop.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should include fix suggestion', () => {
    const workflow = loadFixture('merge-in-loop-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noMergeInLoop.detect(graph, workflow);

    expect(violations[0].fix).toBeDefined();
    expect(violations[0].fix).toContain('Remove');
  });
});
