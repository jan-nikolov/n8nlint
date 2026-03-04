import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';

const JSON_REF_PATTERN = /\$json[.[]/;
const CODE_NODE = 'n8n-nodes-base.code';

/**
 * Recursively extract all string values from a nested object.
 */
function extractStringValues(obj: unknown): string[] {
  const strings: string[] = [];

  if (typeof obj === 'string') {
    strings.push(obj);
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      strings.push(...extractStringValues(item));
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      strings.push(...extractStringValues(value));
    }
  }

  return strings;
}

export const preferNamedNodeReference: LintRule = {
  id: 'prefer-named-node-reference',
  description: 'Using $json with multiple inputs is fragile — use explicit node references instead.',
  defaultSeverity: 'warning',
  docsUrl: 'https://github.com/jnikolov/n8nlint#prefer-named-node-reference',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    graph.forEachNode((nodeName, attrs) => {
      if (shouldIgnoreNode(nodeName)) return;

      // Skip Code nodes — they use $input.first().json which is unambiguous
      if (attrs.nodeType === CODE_NODE) return;

      // Skip nodes with 0 or 1 incoming edge — $json is unambiguous
      if (graph.inDegree(nodeName) <= 1) return;

      const node = workflow.nodes.find((n) => n.name === nodeName);
      if (!node) return;

      const stringValues = extractStringValues(node.parameters);
      for (const str of stringValues) {
        if (JSON_REF_PATTERN.test(str)) {
          violations.push({
            ruleId: 'prefer-named-node-reference',
            severity: 'warning',
            message: `Node "${nodeName}" uses $json with multiple inputs — fragile if workflow is restructured.`,
            nodeName,
            fix: "Replace $json with $('NodeName').first().json to make the data source explicit.",
          });
          break; // One violation per node
        }
      }
    });

    return violations;
  },
};
