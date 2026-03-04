import type { MultiDirectedGraph } from 'graphology';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { findNodesByType } from '../graph/graph-utils.js';

const CODE_NODE = 'n8n-nodes-base.code';

export interface CodeNodeInfo {
  nodeName: string;
  jsCode: string;
}

/**
 * Find all Code nodes and extract their jsCode parameter.
 * Returns only nodes that have non-empty jsCode.
 */
export function getCodeNodes(
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
  workflow: N8nWorkflow,
): CodeNodeInfo[] {
  const codeNodeNames = findNodesByType(graph, CODE_NODE);
  const result: CodeNodeInfo[] = [];

  for (const nodeName of codeNodeNames) {
    const node = workflow.nodes.find((n) => n.name === nodeName);
    if (!node) continue;

    const jsCode = node.parameters?.jsCode;
    if (typeof jsCode === 'string' && jsCode.length > 0) {
      result.push({ nodeName, jsCode });
    }
  }

  return result;
}
