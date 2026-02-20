import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { findConvergenceNodes, getReachableNodes, outputHasConnections } from '../graph/graph-utils.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

/**
 * Filter convergence nodes to only the "first" ones — nodes that are not
 * reachable from another convergence node. This prevents reporting every
 * single downstream node after the initial convergence point.
 */
function filterToFirstConvergence(
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
  convergenceNodes: Set<string>,
): string[] {
  const result: string[] = [];

  for (const node of convergenceNodes) {
    let isReachableFromOtherConvergence = false;

    for (const other of convergenceNodes) {
      if (other === node) continue;
      const reachable = getReachableNodes(graph, other);
      if (reachable.has(node)) {
        isReachableFromOtherConvergence = true;
        break;
      }
    }

    if (!isReachableFromOtherConvergence) {
      result.push(node);
    }
  }

  return result;
}

export const noDualBranchConvergence: LintRule = {
  id: 'no-dual-branch-convergence',
  description: 'Error and success branches converging on the same downstream node causes double-fire with incomplete data.',
  defaultSeverity: 'error',
  docsUrl: 'https://github.com/jnikolov/n8nlint#no-dual-branch-convergence',

  detect(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>): RuleViolation[] {
    const violations: RuleViolation[] = [];

    graph.forEachNode((nodeName, attrs) => {
      if (shouldIgnoreNode(nodeName)) return;
      if (attrs.onError !== 'continueErrorOutput') return;

      // Both outputs must be connected
      const hasSuccess = outputHasConnections(graph, nodeName, 0);
      const hasError = outputHasConnections(graph, nodeName, 1);
      if (!hasSuccess || !hasError) return;

      const allConvergence = findConvergenceNodes(graph, nodeName, 0, 1);
      const firstConvergence = filterToFirstConvergence(graph, allConvergence);

      for (const convergenceNode of firstConvergence) {
        if (shouldIgnoreNode(convergenceNode)) continue;

        violations.push({
          ruleId: 'no-dual-branch-convergence',
          severity: 'error',
          message: `Node '${nodeName}' has continueErrorOutput with both branches converging at '${convergenceNode}'. When items split between success and error, '${convergenceNode}' will fire twice with incomplete data.`,
          nodeName,
          relatedNodes: [convergenceNode],
          fix: `Change '${nodeName}' onError from 'continueErrorOutput' to 'continueRegularOutput'. All items flow through one branch and downstream nodes fire only once.`,
        });
      }
    });

    return violations;
  },
};
