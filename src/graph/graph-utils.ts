import type { MultiDirectedGraph } from 'graphology';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';

type WorkflowGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes>;

/**
 * BFS from a start node. Optionally filter to only follow edges from a specific output index.
 * Returns a Set of reachable node keys (excluding the start node itself unless it's in a cycle).
 */
export function getReachableNodes(
  graph: WorkflowGraph,
  start: string,
  options?: { fromOutputIndex?: number },
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [];

  // Seed with direct neighbors from start
  graph.forEachOutEdge(start, (edge, attrs, source, target) => {
    if (options?.fromOutputIndex !== undefined && attrs.outputIndex !== options.fromOutputIndex) {
      return;
    }
    if (!reachable.has(target)) {
      reachable.add(target);
      queue.push(target);
    }
  });

  // BFS (follow ALL edges from subsequent nodes)
  while (queue.length > 0) {
    const current = queue.shift()!;
    graph.forEachOutEdge(current, (_edge, _attrs, _source, target) => {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    });
  }

  return reachable;
}

/**
 * Reverse BFS — find all nodes that can reach `target` by following edges backwards.
 */
export function getReverseReachableNodes(
  graph: WorkflowGraph,
  target: string,
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [];

  graph.forEachInEdge(target, (_edge, _attrs, source) => {
    if (!reachable.has(source)) {
      reachable.add(source);
      queue.push(source);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    graph.forEachInEdge(current, (_edge, _attrs, source) => {
      if (!reachable.has(source)) {
        reachable.add(source);
        queue.push(source);
      }
    });
  }

  return reachable;
}

/**
 * Get the loop body of a splitInBatches node.
 *
 * Loop body = nodes reachable from output 0 that can also reach back to the split node.
 * This is the intersection of:
 *   - forward reachability from output 0
 *   - reverse reachability to the split node
 */
export function getLoopBody(
  graph: WorkflowGraph,
  splitNodeName: string,
): Set<string> {
  const forwardFromLoop = getReachableNodes(graph, splitNodeName, { fromOutputIndex: 0 });
  const reverseToSplit = getReverseReachableNodes(graph, splitNodeName);

  const loopBody = new Set<string>();
  for (const node of forwardFromLoop) {
    if (node === splitNodeName) continue; // exclude the split node itself
    if (reverseToSplit.has(node)) {
      loopBody.add(node);
    }
  }

  return loopBody;
}

/**
 * Find convergence nodes — nodes reachable from BOTH branch A start and branch B start.
 */
export function findConvergenceNodes(
  graph: WorkflowGraph,
  sourceNode: string,
  outputIndexA: number,
  outputIndexB: number,
): Set<string> {
  const reachableA = getReachableNodes(graph, sourceNode, { fromOutputIndex: outputIndexA });
  const reachableB = getReachableNodes(graph, sourceNode, { fromOutputIndex: outputIndexB });

  const convergence = new Set<string>();
  for (const node of reachableA) {
    if (reachableB.has(node)) {
      convergence.add(node);
    }
  }

  return convergence;
}

/**
 * Check if the workflow is a sub-workflow (has an executeWorkflowTrigger node).
 */
export function isSubWorkflow(graph: WorkflowGraph): boolean {
  return findNodesByType(graph, 'n8n-nodes-base.executeWorkflowTrigger').length > 0;
}

/**
 * Find all nodes of a given type.
 */
export function findNodesByType(graph: WorkflowGraph, nodeType: string): string[] {
  const result: string[] = [];
  graph.forEachNode((node, attrs) => {
    if (attrs.nodeType === nodeType) {
      result.push(node);
    }
  });
  return result;
}

/**
 * Check if a node has connections from a specific output index.
 */
export function outputHasConnections(
  graph: WorkflowGraph,
  nodeName: string,
  outputIndex: number,
): boolean {
  let hasConnection = false;
  graph.forEachOutEdge(nodeName, (_edge, attrs) => {
    if (attrs.outputIndex === outputIndex) {
      hasConnection = true;
    }
  });
  return hasConnection;
}
