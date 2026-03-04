import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';
import { getCodeNodes } from './code-node-utils.js';

const ENV_PATTERN = /\$env[.[]/;

export const codeNodeNoEnv: LintRule = {
  id: 'code-node-no-env',
  description: 'Code nodes accessing $env will fail at runtime in the n8n sandbox.',
  defaultSeverity: 'error',
  docsUrl: 'https://github.com/jnikolov/n8nlint#code-node-no-env',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const { nodeName, jsCode } of getCodeNodes(graph, workflow)) {
      if (shouldIgnoreNode(nodeName)) continue;

      if (ENV_PATTERN.test(jsCode)) {
        violations.push({
          ruleId: 'code-node-no-env',
          severity: 'error',
          message: `Code Node "${nodeName}" accesses $env — not available in sandbox mode.`,
          nodeName,
          fix: 'Use a Set node or config node to pass environment variables into the workflow.',
        });
      }
    }

    return violations;
  },
};
