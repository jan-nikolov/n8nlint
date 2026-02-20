import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { noDeadEndInSubworkflow } from '../../src/rules/no-dead-end-in-subworkflow.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('no-dead-end-in-subworkflow', () => {
  it('should detect dead-end compareDatasets output in sub-workflow', () => {
    const workflow = loadFixture('dead-end-subworkflow-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noDeadEndInSubworkflow.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('no-dead-end-in-subworkflow');
    expect(violations[0].severity).toBe('warning');
    expect(violations[0].nodeName).toBe('Compare');
    expect(violations[0].message).toContain('dead-end');
    expect(violations[0].message).toContain('race condition');
  });

  it('should report IF dead-ends as info severity', () => {
    const workflow = loadFixture('dead-end-subworkflow-if.json');
    const graph = parseWorkflow(workflow);
    const violations = noDeadEndInSubworkflow.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('info');
    expect(violations[0].nodeName).toBe('Filter');
  });

  it('should not flag when all outputs are connected', () => {
    const workflow = loadFixture('dead-end-subworkflow-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = noDeadEndInSubworkflow.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag regular workflows (not sub-workflows)', () => {
    const workflow = loadFixture('dead-end-not-subworkflow.json');
    const graph = parseWorkflow(workflow);
    const violations = noDeadEndInSubworkflow.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'IF n8nlint-ignore', type: 'n8n-nodes-base.if', typeVersion: 2, position: [200, 0], parameters: {} },
        { id: '3', name: 'Process', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: {} },
      ],
      connections: {
        Trigger: { main: [[{ node: 'IF n8nlint-ignore', type: 'main', index: 0 }]] },
        'IF n8nlint-ignore': { main: [[{ node: 'Process', type: 'main', index: 0 }], []] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noDeadEndInSubworkflow.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should include fix suggestion', () => {
    const workflow = loadFixture('dead-end-subworkflow-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noDeadEndInSubworkflow.detect(graph, workflow);

    expect(violations[0].fix).toBeDefined();
    expect(violations[0].fix).toContain('Code node');
  });
});
