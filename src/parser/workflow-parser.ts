import graphology from 'graphology';
import type { MultiDirectedGraph as MultiDirectedGraphType } from 'graphology';
const { MultiDirectedGraph } = graphology;
import type { N8nWorkflow, N8nNode } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';

const IGNORE_MARKER = 'n8nlint-ignore';

/**
 * Check if a JSON object looks like an n8n workflow.
 */
export function isN8nWorkflow(data: unknown): data is N8nWorkflow {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.nodes) && typeof obj.connections === 'object' && obj.connections !== null;
}

/**
 * Resolve onError from either node-level or parameters-level (n8n ambiguity).
 */
function resolveOnError(node: N8nNode): string | undefined {
  return node.onError ?? node.parameters?.onError ?? undefined;
}

/**
 * Count the number of outputs a node has based on its connections.
 */
function countOutputs(workflow: N8nWorkflow, nodeName: string): number {
  const conn = workflow.connections[nodeName];
  if (!conn?.main) return 1;
  return Math.max(conn.main.length, 1);
}

/**
 * Parse an n8n workflow JSON into a directed graph.
 *
 * - Disabled nodes are excluded from the graph.
 * - Only `main` connections are parsed.
 * - Nodes with `n8nlint-ignore` in their name are included in the graph
 *   but flagged (rules skip them individually).
 */
export function parseWorkflow(
  workflow: N8nWorkflow,
): MultiDirectedGraphType<NodeAttributes, EdgeAttributes> {
  const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes>();

  // Add nodes (skip disabled)
  for (const node of workflow.nodes) {
    if (node.disabled === true) continue;

    graph.addNode(node.name, {
      nodeType: node.type,
      typeVersion: node.typeVersion,
      onError: resolveOnError(node),
      outputCount: countOutputs(workflow, node.name),
    });
  }

  // Add edges (only main connections, skip if source or target was filtered out)
  for (const [sourceName, connectionGroup] of Object.entries(workflow.connections)) {
    const mainConnections = connectionGroup.main;
    if (!mainConnections) continue;

    for (let outputIndex = 0; outputIndex < mainConnections.length; outputIndex++) {
      const targets = mainConnections[outputIndex];
      if (!targets) continue;

      for (const target of targets) {
        if (target.type !== 'main') continue;
        if (!graph.hasNode(sourceName) || !graph.hasNode(target.node)) continue;

        graph.addEdge(sourceName, target.node, {
          outputIndex,
          inputIndex: target.index,
        });
      }
    }
  }

  return graph;
}

/**
 * Check if a node name contains the n8nlint-ignore marker.
 */
export function shouldIgnoreNode(nodeName: string): boolean {
  return nodeName.toLowerCase().includes(IGNORE_MARKER.toLowerCase());
}
