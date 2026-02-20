import { describe, it, expect } from 'vitest';
import { parseWorkflow, isN8nWorkflow, shouldIgnoreNode } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

const minimalWorkflow: N8nWorkflow = {
  nodes: [
    { id: '1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} },
    { id: '2', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: {} },
  ],
  connections: {
    Start: {
      main: [[{ node: 'HTTP', type: 'main', index: 0 }]],
    },
  },
};

describe('isN8nWorkflow', () => {
  it('should detect valid n8n workflow', () => {
    expect(isN8nWorkflow(minimalWorkflow)).toBe(true);
  });

  it('should reject missing nodes', () => {
    expect(isN8nWorkflow({ connections: {} })).toBe(false);
  });

  it('should reject missing connections', () => {
    expect(isN8nWorkflow({ nodes: [] })).toBe(false);
  });

  it('should reject null', () => {
    expect(isN8nWorkflow(null)).toBe(false);
  });

  it('should reject primitives', () => {
    expect(isN8nWorkflow('string')).toBe(false);
    expect(isN8nWorkflow(42)).toBe(false);
  });
});

describe('parseWorkflow', () => {
  it('should create graph with correct nodes', () => {
    const graph = parseWorkflow(minimalWorkflow);
    expect(graph.order).toBe(2); // 2 nodes
    expect(graph.hasNode('Start')).toBe(true);
    expect(graph.hasNode('HTTP')).toBe(true);
  });

  it('should create graph with correct edges', () => {
    const graph = parseWorkflow(minimalWorkflow);
    expect(graph.size).toBe(1); // 1 edge
    expect(graph.hasEdge('Start', 'HTTP')).toBe(true);
  });

  it('should store node attributes', () => {
    const graph = parseWorkflow(minimalWorkflow);
    const attrs = graph.getNodeAttributes('HTTP');
    expect(attrs.nodeType).toBe('n8n-nodes-base.httpRequest');
    expect(attrs.typeVersion).toBe(4);
  });

  it('should store edge attributes', () => {
    const graph = parseWorkflow(minimalWorkflow);
    const edges = graph.edges('Start', 'HTTP');
    const attrs = graph.getEdgeAttributes(edges[0]);
    expect(attrs.outputIndex).toBe(0);
    expect(attrs.inputIndex).toBe(0);
  });

  it('should exclude disabled nodes', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Active', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Disabled', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: {}, disabled: true },
      ],
      connections: {
        Active: { main: [[{ node: 'Disabled', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    expect(graph.order).toBe(1);
    expect(graph.hasNode('Active')).toBe(true);
    expect(graph.hasNode('Disabled')).toBe(false);
    expect(graph.size).toBe(0); // edge skipped because target is disabled
  });

  it('should skip non-main connections', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'A', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'B', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: {} },
      ],
      connections: {
        A: {
          main: [[{ node: 'B', type: 'ai_tool', index: 0 }]],
        },
      },
    };

    const graph = parseWorkflow(workflow);
    expect(graph.size).toBe(0);
  });

  it('should resolve onError from node level', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {}, onError: 'continueErrorOutput' },
      ],
      connections: {},
    };

    const graph = parseWorkflow(workflow);
    expect(graph.getNodeAttributes('HTTP').onError).toBe('continueErrorOutput');
  });

  it('should resolve onError from parameters level', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: { onError: 'continueErrorOutput' } },
      ],
      connections: {},
    };

    const graph = parseWorkflow(workflow);
    expect(graph.getNodeAttributes('HTTP').onError).toBe('continueErrorOutput');
  });

  it('should prefer node-level onError over parameters-level', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: { onError: 'stopWorkflow' }, onError: 'continueErrorOutput' },
      ],
      connections: {},
    };

    const graph = parseWorkflow(workflow);
    expect(graph.getNodeAttributes('HTTP').onError).toBe('continueErrorOutput');
  });

  it('should handle multi-output connections', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Split', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, position: [0, 0], parameters: {} },
        { id: '2', name: 'Body', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: {} },
        { id: '3', name: 'Done', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 200], parameters: {} },
      ],
      connections: {
        Split: {
          main: [
            [{ node: 'Body', type: 'main', index: 0 }],
            [{ node: 'Done', type: 'main', index: 0 }],
          ],
        },
      },
    };

    const graph = parseWorkflow(workflow);
    expect(graph.size).toBe(2);
    const edgeToBody = graph.edges('Split', 'Body')[0];
    expect(graph.getEdgeAttributes(edgeToBody).outputIndex).toBe(0);
    const edgeToDone = graph.edges('Split', 'Done')[0];
    expect(graph.getEdgeAttributes(edgeToDone).outputIndex).toBe(1);
  });
});

describe('shouldIgnoreNode', () => {
  it('should detect n8nlint-ignore marker', () => {
    expect(shouldIgnoreNode('HTTP n8nlint-ignore')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(shouldIgnoreNode('HTTP N8NLINT-IGNORE')).toBe(true);
  });

  it('should return false for normal names', () => {
    expect(shouldIgnoreNode('HTTP Request')).toBe(false);
  });
});
