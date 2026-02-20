import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { noUnreachableNodes } from '../../src/rules/no-unreachable-nodes.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('no-unreachable-nodes', () => {
  it('should detect orphan node without incoming connections', () => {
    const workflow = loadFixture('unreachable-nodes-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noUnreachableNodes.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('no-unreachable-nodes');
    expect(violations[0].severity).toBe('warning');
    expect(violations[0].nodeName).toBe('Orphan');
  });

  it('should not flag workflows where all nodes are connected', () => {
    const workflow = loadFixture('unreachable-nodes-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = noUnreachableNodes.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag trigger nodes', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [0, 200], parameters: {} },
        { id: '3', name: 'Workflow Trigger', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1, position: [0, 400], parameters: {} },
        { id: '4', name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1, position: [0, 600], parameters: {} },
      ],
      connections: {},
    };

    const graph = parseWorkflow(workflow);
    const violations = noUnreachableNodes.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Orphan n8nlint-ignore', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 200], parameters: {} },
      ],
      connections: {},
    };

    const graph = parseWorkflow(workflow);
    const violations = noUnreachableNodes.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should include fix suggestion', () => {
    const workflow = loadFixture('unreachable-nodes-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noUnreachableNodes.detect(graph, workflow);

    expect(violations[0].fix).toBeDefined();
  });
});
