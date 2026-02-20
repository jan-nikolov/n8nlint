import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { httpNoErrorHandling } from '../../src/rules/http-no-error-handling.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('http-no-error-handling', () => {
  it('should detect HTTP node without error handling', () => {
    const workflow = loadFixture('http-no-error-handling-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = httpNoErrorHandling.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('http-no-error-handling');
    expect(violations[0].severity).toBe('info');
    expect(violations[0].nodeName).toBe('Fetch Data');
  });

  it('should not flag HTTP node with onError configured', () => {
    const workflow = loadFixture('http-no-error-handling-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = httpNoErrorHandling.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should accept onError in parameters', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'API Call', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [200, 0], parameters: { url: 'https://example.com', onError: 'continueErrorOutput' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'API Call', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = httpNoErrorHandling.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should not flag non-HTTP nodes', () => {
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
    const violations = httpNoErrorHandling.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'API n8nlint-ignore', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [200, 0], parameters: { url: 'https://example.com' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'API n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = httpNoErrorHandling.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should include fix suggestion', () => {
    const workflow = loadFixture('http-no-error-handling-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = httpNoErrorHandling.detect(graph, workflow);

    expect(violations[0].fix).toBeDefined();
    expect(violations[0].fix).toContain('onError');
  });
});
