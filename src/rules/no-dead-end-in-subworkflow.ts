import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation, Severity } from '../types/rule.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import { isSubWorkflow, outputHasConnections } from '../graph/graph-utils.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

/** Node types that are high-risk when they have dead-end outputs in sub-workflows. */
const HIGH_RISK_TYPES = new Set([
  'n8n-nodes-base.compareDatasets',
]);

/** Node types that are low-risk code smells (IF/Switch with dead-ends). */
const LOW_RISK_TYPES = new Set([
  'n8n-nodes-base.if',
  'n8n-nodes-base.switch',
]);

/**
 * Determine severity based on node type and onError setting.
 *
 * - compareDatasets + onError:continueErrorOutput → warning (real race-condition risk)
 * - IF/Switch dead-ends → info (code smell, not a bug)
 * - Other multi-output nodes with dead-ends → warning
 */
function determineSeverity(nodeType: string, _onError?: string): Severity {
  if (LOW_RISK_TYPES.has(nodeType)) return 'info';
  return 'warning';
}

export const noDeadEndInSubworkflow: LintRule = {
  id: 'no-dead-end-in-subworkflow',
  description: 'Multi-output nodes with dead-end outputs in sub-workflows can cause race conditions where the parent receives wrong return data.',
  defaultSeverity: 'warning',
  docsUrl: 'https://github.com/jnikolov/n8nlint#no-dead-end-in-subworkflow',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    if (!isSubWorkflow(graph)) return [];

    const violations: RuleViolation[] = [];

    graph.forEachNode((nodeName, attrs) => {
      if (shouldIgnoreNode(nodeName)) return;
      if (attrs.outputCount < 2) return;

      const deadEndOutputs: number[] = [];
      for (let i = 0; i < attrs.outputCount; i++) {
        if (!outputHasConnections(graph, nodeName, i)) {
          deadEndOutputs.push(i);
        }
      }

      if (deadEndOutputs.length === 0) return;

      const severity = determineSeverity(attrs.nodeType, attrs.onError);
      const isHighRisk = HIGH_RISK_TYPES.has(attrs.nodeType);

      violations.push({
        ruleId: 'no-dead-end-in-subworkflow',
        severity,
        message: `Node '${nodeName}' has dead-end output(s) [${deadEndOutputs.join(', ')}] in a sub-workflow. ${
          isHighRisk
            ? 'This can cause a race condition where the parent workflow receives wrong return data.'
            : 'Consider using a Filter node instead for cleaner data flow.'
        }`,
        nodeName,
        fix: isHighRisk
          ? 'Replace the multi-output node with a single-output Code node that returns only the desired items.'
          : 'Connect all outputs or replace with a Filter node.',
      });
    });

    return violations;
  },
};
