import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

export const httpNoErrorHandling: LintRule = {
  id: 'http-no-error-handling',
  description: 'HTTP Request nodes without error handling will stop the entire workflow on HTTP errors.',
  defaultSeverity: 'info',
  docsUrl: 'https://github.com/jnikolov/n8nlint#http-no-error-handling',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    graph.forEachNode((node, attrs) => {
      if (attrs.nodeType !== HTTP_REQUEST) return;
      if (shouldIgnoreNode(node)) return;

      // onError is resolved from both node-level and parameters-level during parsing
      // and stored in NodeAttributes. If it's undefined, no error handling is configured.
      if (attrs.onError === undefined) {
        violations.push({
          ruleId: 'http-no-error-handling',
          severity: 'info',
          message: `HTTP Request node '${node}' has no error handling configured. The workflow will stop on HTTP errors.`,
          nodeName: node,
          fix: 'Set onError to "continueRegularOutput" or "continueErrorOutput" to handle HTTP errors gracefully.',
        });
      }
    });

    return violations;
  },
};
