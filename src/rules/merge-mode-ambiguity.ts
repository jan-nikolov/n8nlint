import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

const MERGE = 'n8n-nodes-base.merge';

export const mergeModeAmbiguity: LintRule = {
  id: 'merge-mode-ambiguity',
  description: 'Merge nodes without an explicit mode may not behave as intended.',
  defaultSeverity: 'info',
  docsUrl: 'https://github.com/jnikolov/n8nlint#merge-mode-ambiguity',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    graph.forEachNode((nodeName, attrs) => {
      if (attrs.nodeType !== MERGE) return;
      if (shouldIgnoreNode(nodeName)) return;

      const node = workflow.nodes.find((n) => n.name === nodeName);
      if (!node) return;

      if (node.parameters?.mode === undefined) {
        violations.push({
          ruleId: 'merge-mode-ambiguity',
          severity: 'info',
          message: `Merge node "${nodeName}" has no explicit mode configured. The default behavior may not be intended.`,
          nodeName,
          fix: 'Set the mode parameter explicitly (e.g., "append", "combine", "chooseBranch").',
        });
      }
    });

    return violations;
  },
};
