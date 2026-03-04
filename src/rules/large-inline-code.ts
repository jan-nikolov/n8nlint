import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';
import { getCodeNodes } from './code-node-utils.js';

const LINE_THRESHOLD = 100;

export const largeInlineCode: LintRule = {
  id: 'large-inline-code',
  description: 'Code nodes with excessive inline code should be extracted to sub-workflows.',
  defaultSeverity: 'info',
  docsUrl: 'https://github.com/jnikolov/n8nlint#large-inline-code',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const { nodeName, jsCode } of getCodeNodes(graph, workflow)) {
      if (shouldIgnoreNode(nodeName)) continue;

      const lineCount = jsCode.split('\n').length;
      if (lineCount > LINE_THRESHOLD) {
        violations.push({
          ruleId: 'large-inline-code',
          severity: 'info',
          message: `Code Node "${nodeName}" has ${lineCount} lines of inline code (threshold: ${LINE_THRESHOLD}). Consider extracting to a sub-workflow.`,
          nodeName,
          fix: 'Extract the code logic into a separate sub-workflow for better maintainability.',
        });
      }
    }

    return violations;
  },
};
