export { parseWorkflow, isN8nWorkflow, shouldIgnoreNode } from './parser/workflow-parser.js';
export { runRules, getAllRules } from './engine/rule-engine.js';
export { loadConfig } from './config/config-loader.js';
export { DEFAULT_CONFIG } from './config/defaults.js';

export type { N8nWorkflow, N8nNode, N8nConnection, N8nConnectionMap } from './types/n8n-workflow.js';
export type { LintRule, RuleViolation, Severity } from './types/rule.js';
export type { NodeAttributes, EdgeAttributes } from './types/graph.js';
export type { N8nLintConfig, RuleSetting } from './types/config.js';
export type { Reporter, FileResult } from './reporters/reporter.js';

export { noMergeInLoop, noDeadEndInSubworkflow, noDualBranchConvergence } from './rules/index.js';
export { terminalReporter } from './reporters/terminal-reporter.js';
export { jsonReporter } from './reporters/json-reporter.js';
