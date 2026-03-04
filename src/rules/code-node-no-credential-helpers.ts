import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';
import { getCodeNodes } from './code-node-utils.js';

const CREDENTIAL_PATTERNS: Array<{ pattern: RegExp; method: string }> = [
  { pattern: /this\.getCredentials\s*\(/, method: 'this.getCredentials()' },
  { pattern: /this\.helpers\.httpRequestWithAuthentication\s*\(/, method: 'this.helpers.httpRequestWithAuthentication()' },
  { pattern: /this\.helpers\.requestOAuth2/, method: 'this.helpers.requestOAuth2()' },
  { pattern: /this\.helpers\.request\s*\(/, method: 'this.helpers.request()' },
];

export const codeNodeNoCredentialHelpers: LintRule = {
  id: 'code-node-no-credential-helpers',
  description: 'Code nodes using credential/HTTP helper APIs that are only available in custom nodes.',
  defaultSeverity: 'error',
  docsUrl: 'https://github.com/jnikolov/n8nlint#code-node-no-credential-helpers',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const { nodeName, jsCode } of getCodeNodes(graph, workflow)) {
      if (shouldIgnoreNode(nodeName)) continue;

      const foundMethods: string[] = [];
      for (const { pattern, method } of CREDENTIAL_PATTERNS) {
        if (pattern.test(jsCode)) {
          foundMethods.push(method);
        }
      }

      if (foundMethods.length > 0) {
        violations.push({
          ruleId: 'code-node-no-credential-helpers',
          severity: 'error',
          message: `Code Node "${nodeName}" uses ${foundMethods.join(', ')} — not available in Code nodes.`,
          nodeName,
          fix: 'Use an HTTP Request node for authenticated API calls instead of credential helpers in Code nodes.',
        });
      }
    }

    return violations;
  },
};
