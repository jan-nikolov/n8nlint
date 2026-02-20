import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { splitInBatchesMissingLoopBack } from '../../src/rules/splitInBatches-missing-loop-back.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('splitInBatches-missing-loop-back', () => {
  it('should detect loop body without path back to split node', () => {
    const workflow = loadFixture('missing-loop-back-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = splitInBatchesMissingLoopBack.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('splitInBatches-missing-loop-back');
    expect(violations[0].severity).toBe('error');
    expect(violations[0].nodeName).toBe('Loop');
  });

  it('should not flag when loop body connects back', () => {
    const workflow = loadFixture('missing-loop-back-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = splitInBatchesMissingLoopBack.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag splitInBatches without loop body connections', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Loop', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, position: [200, 0], parameters: {} },
        { id: '3', name: 'Done', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: {} },
      ],
      connections: {
        Start: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
        Loop: { main: [[], [{ node: 'Done', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = splitInBatchesMissingLoopBack.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Loop n8nlint-ignore', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, position: [200, 0], parameters: {} },
        { id: '3', name: 'Process', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: {} },
      ],
      connections: {
        Start: { main: [[{ node: 'Loop n8nlint-ignore', type: 'main', index: 0 }]] },
        'Loop n8nlint-ignore': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = splitInBatchesMissingLoopBack.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should include fix suggestion', () => {
    const workflow = loadFixture('missing-loop-back-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = splitInBatchesMissingLoopBack.detect(graph, workflow);

    expect(violations[0].fix).toBeDefined();
    expect(violations[0].fix).toContain('Connect');
  });
});
