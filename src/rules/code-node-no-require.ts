import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';
import { getCodeNodes } from './code-node-utils.js';

const REQUIRE_PATTERN = /require\s*\(/;

export const codeNodeNoRequire: LintRule = {
  id: 'code-node-no-require',
  description: 'Code nodes using require() will fail at runtime in the n8n sandbox.',
  defaultSeverity: 'error',
  docsUrl: 'https://github.com/jnikolov/n8nlint#code-node-no-require',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const { nodeName, jsCode } of getCodeNodes(graph, workflow)) {
      if (shouldIgnoreNode(nodeName)) continue;

      if (REQUIRE_PATTERN.test(jsCode)) {
        violations.push({
          ruleId: 'code-node-no-require',
          severity: 'error',
          message: `Code Node "${nodeName}" uses require() — not available in the n8n sandbox.`,
          nodeName,
          fix: 'Use built-in n8n nodes or helpers instead of require().',
        });
      }
    }

    return violations;
  },
};
