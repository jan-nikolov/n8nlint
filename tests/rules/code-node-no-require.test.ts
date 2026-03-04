import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { codeNodeNoRequire } from '../../src/rules/code-node-no-require.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('code-node-no-require', () => {
  it('should detect require() in Code node', () => {
    const workflow = loadFixture('code-require-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoRequire.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('code-node-no-require');
    expect(violations[0].severity).toBe('error');
    expect(violations[0].nodeName).toBe('HMAC Verify');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag clean Code node', () => {
    const workflow = loadFixture('code-require-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoRequire.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Code n8nlint-ignore', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode: "const fs = require('fs');" } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Code n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoRequire.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag non-Code nodes', () => {
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
    const violations = codeNodeNoRequire.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });
});
