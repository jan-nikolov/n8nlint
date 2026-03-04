import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { preferNamedNodeReference } from '../../src/rules/prefer-named-node-reference.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('prefer-named-node-reference', () => {
  it('should detect $json with multiple inputs', () => {
    const workflow = loadFixture('prefer-named-ref-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = preferNamedNodeReference.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('prefer-named-node-reference');
    expect(violations[0].severity).toBe('warning');
    expect(violations[0].nodeName).toBe('Result');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag explicit node references', () => {
    const workflow = loadFixture('prefer-named-ref-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = preferNamedNodeReference.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag nodes with single input', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: { assignments: { assignments: [{ name: 'v', value: '={{ $json.field }}', type: 'string' }] } } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = preferNamedNodeReference.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip Code nodes', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Set A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: {} },
        { id: '3', name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2, position: [400, 0], parameters: { jsCode: 'const x = $json.field;' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Set A', type: 'main', index: 0 }, { node: 'Code', type: 'main', index: 0 }]] },
        'Set A': { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = preferNamedNodeReference.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Set A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: {} },
        { id: '3', name: 'Result n8nlint-ignore', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: { assignments: { assignments: [{ name: 'v', value: '={{ $json.field }}', type: 'string' }] } } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Set A', type: 'main', index: 0 }, { node: 'Result n8nlint-ignore', type: 'main', index: 0 }]] },
        'Set A': { main: [[{ node: 'Result n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = preferNamedNodeReference.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should detect $json bracket access', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Set A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: {} },
        { id: '3', name: 'Result', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: { assignments: { assignments: [{ name: 'v', value: "={{ $json['field'] }}", type: 'string' }] } } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Set A', type: 'main', index: 0 }, { node: 'Result', type: 'main', index: 0 }]] },
        'Set A': { main: [[{ node: 'Result', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = preferNamedNodeReference.detect(graph, workflow);

    expect(violations).toHaveLength(1);
  });
});
