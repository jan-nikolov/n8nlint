import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

/**
 * Trigger node types are expected to have no incoming connections.
 */
function isTriggerNode(nodeType: string): boolean {
  return (
    nodeType.endsWith('Trigger') ||
    nodeType === 'n8n-nodes-base.start' ||
    nodeType === 'n8n-nodes-base.manualTrigger' ||
    nodeType === 'n8n-nodes-base.webhook'
  );
}

export const noUnreachableNodes: LintRule = {
  id: 'no-unreachable-nodes',
  description: 'Nodes without incoming connections are unreachable and will never execute.',
  defaultSeverity: 'warning',
  docsUrl: 'https://github.com/jnikolov/n8nlint#no-unreachable-nodes',

  detect(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>): RuleViolation[] {
    const violations: RuleViolation[] = [];

    graph.forEachNode((node, attrs) => {
      if (shouldIgnoreNode(node)) return;
      if (isTriggerNode(attrs.nodeType)) return;

      if (graph.inDegree(node) === 0) {
        violations.push({
          ruleId: 'no-unreachable-nodes',
          severity: 'warning',
          message: `Node '${node}' has no incoming connections and will never execute.`,
          nodeName: node,
          fix: 'Connect this node to the workflow or remove it if unused.',
        });
      }
    });

    return violations;
  },
};
