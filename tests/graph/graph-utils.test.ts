import { describe, it, expect } from 'vitest';
import { DirectedGraph } from 'graphology';
import type { NodeAttributes, EdgeAttributes } from '../../src/types/graph.js';
import {
  getReachableNodes,
  getReverseReachableNodes,
  getLoopBody,
  findConvergenceNodes,
  isSubWorkflow,
  findNodesByType,
  outputHasConnections,
} from '../../src/graph/graph-utils.js';

function createTestGraph(): DirectedGraph<NodeAttributes, EdgeAttributes> {
  const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();

  // A → B → C → D
  //       ↘ E
  graph.addNode('A', { nodeType: 'start', typeVersion: 1, outputCount: 1 });
  graph.addNode('B', { nodeType: 'if', typeVersion: 1, outputCount: 2 });
  graph.addNode('C', { nodeType: 'http', typeVersion: 1, outputCount: 1 });
  graph.addNode('D', { nodeType: 'set', typeVersion: 1, outputCount: 1 });
  graph.addNode('E', { nodeType: 'set', typeVersion: 1, outputCount: 1 });

  graph.addEdge('A', 'B', { outputIndex: 0, inputIndex: 0 });
  graph.addEdge('B', 'C', { outputIndex: 0, inputIndex: 0 });
  graph.addEdge('B', 'E', { outputIndex: 1, inputIndex: 0 });
  graph.addEdge('C', 'D', { outputIndex: 0, inputIndex: 0 });

  return graph;
}

describe('getReachableNodes', () => {
  it('should find all reachable nodes from start', () => {
    const graph = createTestGraph();
    const reachable = getReachableNodes(graph, 'A');
    expect(reachable).toEqual(new Set(['B', 'C', 'D', 'E']));
  });

  it('should filter by output index', () => {
    const graph = createTestGraph();
    const reachable = getReachableNodes(graph, 'B', { fromOutputIndex: 0 });
    expect(reachable).toEqual(new Set(['C', 'D']));
  });

  it('should filter by output index (branch 1)', () => {
    const graph = createTestGraph();
    const reachable = getReachableNodes(graph, 'B', { fromOutputIndex: 1 });
    expect(reachable).toEqual(new Set(['E']));
  });

  it('should return empty set for leaf node', () => {
    const graph = createTestGraph();
    const reachable = getReachableNodes(graph, 'D');
    expect(reachable.size).toBe(0);
  });
});

describe('getReverseReachableNodes', () => {
  it('should find all nodes that can reach target', () => {
    const graph = createTestGraph();
    const reverse = getReverseReachableNodes(graph, 'D');
    expect(reverse).toEqual(new Set(['C', 'B', 'A']));
  });

  it('should return empty set for root node', () => {
    const graph = createTestGraph();
    const reverse = getReverseReachableNodes(graph, 'A');
    expect(reverse.size).toBe(0);
  });
});

describe('getLoopBody', () => {
  it('should find loop body nodes', () => {
    const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();

    // Split -[0]→ Body1 → Body2 → Split (loop-back)
    // Split -[1]→ Done
    graph.addNode('Split', { nodeType: 'n8n-nodes-base.splitInBatches', typeVersion: 3, outputCount: 2 });
    graph.addNode('Body1', { nodeType: 'http', typeVersion: 1, outputCount: 1 });
    graph.addNode('Body2', { nodeType: 'set', typeVersion: 1, outputCount: 1 });
    graph.addNode('Done', { nodeType: 'set', typeVersion: 1, outputCount: 1 });

    graph.addEdge('Split', 'Body1', { outputIndex: 0, inputIndex: 0 });
    graph.addEdge('Body1', 'Body2', { outputIndex: 0, inputIndex: 0 });
    graph.addEdge('Body2', 'Split', { outputIndex: 0, inputIndex: 0 });
    graph.addEdge('Split', 'Done', { outputIndex: 1, inputIndex: 0 });

    const body = getLoopBody(graph, 'Split');
    expect(body).toEqual(new Set(['Body1', 'Body2']));
    expect(body.has('Done')).toBe(false);
  });

  it('should return empty set when no loop-back exists', () => {
    const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();
    graph.addNode('Split', { nodeType: 'n8n-nodes-base.splitInBatches', typeVersion: 3, outputCount: 2 });
    graph.addNode('Body', { nodeType: 'http', typeVersion: 1, outputCount: 1 });
    graph.addEdge('Split', 'Body', { outputIndex: 0, inputIndex: 0 });

    const body = getLoopBody(graph, 'Split');
    expect(body.size).toBe(0);
  });
});

describe('findConvergenceNodes', () => {
  it('should find nodes reachable from both branches', () => {
    const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();

    // HTTP -[0]→ Success → Aggregate
    // HTTP -[1]→ Error   → Aggregate
    graph.addNode('HTTP', { nodeType: 'http', typeVersion: 1, onError: 'continueErrorOutput', outputCount: 2 });
    graph.addNode('Success', { nodeType: 'set', typeVersion: 1, outputCount: 1 });
    graph.addNode('Error', { nodeType: 'set', typeVersion: 1, outputCount: 1 });
    graph.addNode('Aggregate', { nodeType: 'n8n-nodes-base.aggregate', typeVersion: 1, outputCount: 1 });

    graph.addEdge('HTTP', 'Success', { outputIndex: 0, inputIndex: 0 });
    graph.addEdge('HTTP', 'Error', { outputIndex: 1, inputIndex: 0 });
    graph.addEdge('Success', 'Aggregate', { outputIndex: 0, inputIndex: 0 });
    graph.addEdge('Error', 'Aggregate', { outputIndex: 0, inputIndex: 0 });

    const convergence = findConvergenceNodes(graph, 'HTTP', 0, 1);
    expect(convergence).toEqual(new Set(['Aggregate']));
  });

  it('should return empty set when branches do not converge', () => {
    const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();

    graph.addNode('IF', { nodeType: 'if', typeVersion: 1, outputCount: 2 });
    graph.addNode('True', { nodeType: 'set', typeVersion: 1, outputCount: 1 });
    graph.addNode('False', { nodeType: 'set', typeVersion: 1, outputCount: 1 });

    graph.addEdge('IF', 'True', { outputIndex: 0, inputIndex: 0 });
    graph.addEdge('IF', 'False', { outputIndex: 1, inputIndex: 0 });

    const convergence = findConvergenceNodes(graph, 'IF', 0, 1);
    expect(convergence.size).toBe(0);
  });
});

describe('isSubWorkflow', () => {
  it('should detect sub-workflow', () => {
    const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();
    graph.addNode('Trigger', { nodeType: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1, outputCount: 1 });
    expect(isSubWorkflow(graph)).toBe(true);
  });

  it('should return false for regular workflow', () => {
    const graph = new DirectedGraph<NodeAttributes, EdgeAttributes>();
    graph.addNode('Start', { nodeType: 'n8n-nodes-base.start', typeVersion: 1, outputCount: 1 });
    expect(isSubWorkflow(graph)).toBe(false);
  });
});

describe('findNodesByType', () => {
  it('should find nodes by type', () => {
    const graph = createTestGraph();
    expect(findNodesByType(graph, 'if')).toEqual(['B']);
  });

  it('should return empty array for non-existent type', () => {
    const graph = createTestGraph();
    expect(findNodesByType(graph, 'nonexistent')).toEqual([]);
  });
});

describe('outputHasConnections', () => {
  it('should return true for connected output', () => {
    const graph = createTestGraph();
    expect(outputHasConnections(graph, 'B', 0)).toBe(true);
  });

  it('should return false for unconnected output', () => {
    const graph = createTestGraph();
    expect(outputHasConnections(graph, 'D', 0)).toBe(false);
  });

  it('should differentiate output indices', () => {
    const graph = createTestGraph();
    expect(outputHasConnections(graph, 'B', 0)).toBe(true);
    expect(outputHasConnections(graph, 'B', 1)).toBe(true);
    expect(outputHasConnections(graph, 'B', 2)).toBe(false);
  });
});
