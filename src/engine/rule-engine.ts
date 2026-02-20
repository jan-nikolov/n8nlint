import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation, Severity } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { N8nLintConfig, RuleSetting } from '../types/config.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import {
  noMergeInLoop,
  noDeadEndInSubworkflow,
  noDualBranchConvergence,
  noUnreachableNodes,
  splitInBatchesMissingLoopBack,
  httpNoErrorHandling,
} from '../rules/index.js';

const ALL_RULES: LintRule[] = [
  noMergeInLoop,
  noDeadEndInSubworkflow,
  noDualBranchConvergence,
  noUnreachableNodes,
  splitInBatchesMissingLoopBack,
  httpNoErrorHandling,
];

/**
 * Run all enabled rules against a parsed workflow graph.
 */
export function runRules(
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
  workflow: N8nWorkflow,
  config: N8nLintConfig,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (const rule of ALL_RULES) {
    const setting: RuleSetting = config.rules[rule.id] ?? rule.defaultSeverity;
    if (setting === 'off') continue;

    const ruleViolations = rule.detect(graph, workflow);

    // Override severity if config specifies a different one
    for (const v of ruleViolations) {
      v.severity = setting as Severity;
      violations.push(v);
    }
  }

  return violations;
}

/**
 * Get all registered rules.
 */
export function getAllRules(): LintRule[] {
  return [...ALL_RULES];
}
