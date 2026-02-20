import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { findNodesByType, getReachableNodes } from '../graph/graph-utils.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

const SPLIT_IN_BATCHES = 'n8n-nodes-base.splitInBatches';

export const splitInBatchesMissingLoopBack: LintRule = {
  id: 'splitInBatches-missing-loop-back',
  description: 'splitInBatches loop body has no path back to the split node, so the loop will stop after one batch.',
  defaultSeverity: 'error',
  docsUrl: 'https://github.com/jnikolov/n8nlint#splitinbatches-missing-loop-back',

  detect(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const splitNodes = findNodesByType(graph, SPLIT_IN_BATCHES);

    for (const splitNode of splitNodes) {
      if (shouldIgnoreNode(splitNode)) continue;

      // Check if output 0 (loop body) has any connections at all
      let hasLoopBodyConnection = false;
      graph.forEachOutEdge(splitNode, (_edge, attrs) => {
        if (attrs.outputIndex === 0) hasLoopBodyConnection = true;
      });
      if (!hasLoopBodyConnection) continue;

      // Check if any node reachable from output 0 leads back to the split node
      const reachable = getReachableNodes(graph, splitNode, { fromOutputIndex: 0 });
      if (!reachable.has(splitNode)) {
        violations.push({
          ruleId: 'splitInBatches-missing-loop-back',
          severity: 'error',
          message: `splitInBatches '${splitNode}' loop body has no path back to the split node. The loop will process only the first batch.`,
          nodeName: splitNode,
          fix: 'Connect the last node in the loop body back to the splitInBatches node to complete the loop.',
        });
      }
    }

    return violations;
  },
};
