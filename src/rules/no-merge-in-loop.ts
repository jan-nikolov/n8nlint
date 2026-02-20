import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { findNodesByType, getLoopBody } from '../graph/graph-utils.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

const SPLIT_IN_BATCHES = 'n8n-nodes-base.splitInBatches';
const MERGE = 'n8n-nodes-base.merge';

export const noMergeInLoop: LintRule = {
  id: 'no-merge-in-loop',
  description: 'Merge nodes inside splitInBatches loops cause the loop to halt after the first iteration.',
  defaultSeverity: 'error',
  docsUrl: 'https://github.com/jnikolov/n8nlint#no-merge-in-loop',

  detect(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const splitNodes = findNodesByType(graph, SPLIT_IN_BATCHES);

    for (const splitNode of splitNodes) {
      if (shouldIgnoreNode(splitNode)) continue;

      const loopBody = getLoopBody(graph, splitNode);

      for (const bodyNode of loopBody) {
        if (shouldIgnoreNode(bodyNode)) continue;

        const attrs = graph.getNodeAttributes(bodyNode);
        if (attrs.nodeType === MERGE) {
          violations.push({
            ruleId: 'no-merge-in-loop',
            severity: 'error',
            message: `Merge node '${bodyNode}' inside splitInBatches loop '${splitNode}' will cause the loop to halt after the first iteration.`,
            nodeName: bodyNode,
            relatedNodes: [splitNode],
            fix: `Remove the Merge node. Connect both branches directly to the next node — n8n supports multiple input connections on a single node input.`,
          });
        }
      }
    }

    return violations;
  },
};
