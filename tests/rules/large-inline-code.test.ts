import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { largeInlineCode } from '../../src/rules/large-inline-code.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('large-inline-code', () => {
  it('should detect Code node with >100 lines', () => {
    const workflow = loadFixture('large-inline-code-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = largeInlineCode.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('large-inline-code');
    expect(violations[0].severity).toBe('info');
    expect(violations[0].nodeName).toBe('Big Code');
    expect(violations[0].message).toContain('101');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag small Code node', () => {
    const workflow = loadFixture('large-inline-code-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = largeInlineCode.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag exactly 100 lines', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `// line ${i + 1}`).join('\n');
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode: lines } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = largeInlineCode.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const lines = Array.from({ length: 150 }, (_, i) => `// line ${i + 1}`).join('\n');
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Code n8nlint-ignore', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode: lines } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Code n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = largeInlineCode.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });
});
