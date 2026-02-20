import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { noDualBranchConvergence } from '../../src/rules/no-dual-branch-convergence.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('no-dual-branch-convergence', () => {
  it('should detect converging error and success branches', () => {
    const workflow = loadFixture('dual-branch-convergence-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('no-dual-branch-convergence');
    expect(violations[0].severity).toBe('error');
    expect(violations[0].nodeName).toBe('HTTP Request');
    expect(violations[0].relatedNodes).toContain('Aggregate All');
    expect(violations[0].message).toContain('fire twice');
  });

  it('should not flag when branches do not converge', () => {
    const workflow = loadFixture('dual-branch-convergence-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag nodes without continueErrorOutput', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {} },
        { id: '2', name: 'Next', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        HTTP: { main: [[{ node: 'Next', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should not flag when only one output is connected', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {}, onError: 'continueErrorOutput' },
        { id: '2', name: 'Success', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0], parameters: {} },
      ],
      connections: {
        HTTP: { main: [[{ node: 'Success', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should detect indirect convergence', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {}, onError: 'continueErrorOutput' },
        { id: '2', name: 'S1', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, -100], parameters: {} },
        { id: '3', name: 'S2', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, -100], parameters: {} },
        { id: '4', name: 'E1', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 100], parameters: {} },
        { id: '5', name: 'Merge', type: 'n8n-nodes-base.aggregate', typeVersion: 1, position: [600, 0], parameters: {} },
      ],
      connections: {
        HTTP: {
          main: [
            [{ node: 'S1', type: 'main', index: 0 }],
            [{ node: 'E1', type: 'main', index: 0 }],
          ],
        },
        S1: { main: [[{ node: 'S2', type: 'main', index: 0 }]] },
        S2: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
        E1: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].relatedNodes).toContain('Merge');
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP n8nlint-ignore', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {}, onError: 'continueErrorOutput' },
        { id: '2', name: 'Success', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, -100], parameters: {} },
        { id: '3', name: 'Error', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 100], parameters: {} },
        { id: '4', name: 'Merge', type: 'n8n-nodes-base.aggregate', typeVersion: 1, position: [400, 0], parameters: {} },
      ],
      connections: {
        'HTTP n8nlint-ignore': {
          main: [
            [{ node: 'Success', type: 'main', index: 0 }],
            [{ node: 'Error', type: 'main', index: 0 }],
          ],
        },
        Success: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
        Error: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);
    expect(violations).toHaveLength(0);
  });

  it('should include fix suggestion', () => {
    const workflow = loadFixture('dual-branch-convergence-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);

    expect(violations[0].fix).toContain('continueRegularOutput');
  });

  it('should resolve onError from parameters level', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: { onError: 'continueErrorOutput' } },
        { id: '2', name: 'Success', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, -100], parameters: {} },
        { id: '3', name: 'Error', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 100], parameters: {} },
        { id: '4', name: 'End', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: {} },
      ],
      connections: {
        HTTP: {
          main: [
            [{ node: 'Success', type: 'main', index: 0 }],
            [{ node: 'Error', type: 'main', index: 0 }],
          ],
        },
        Success: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
        Error: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = noDualBranchConvergence.detect(graph, workflow);
    expect(violations).toHaveLength(1);
  });
});
