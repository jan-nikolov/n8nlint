import type { MultiDirectedGraph } from 'graphology';
import type { N8nWorkflow } from './n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from './graph.js';

export type Severity = 'error' | 'warning' | 'info';

export interface RuleViolation {
  ruleId: string;
  severity: Severity;
  message: string;
  nodeName: string;
  relatedNodes?: string[];
  fix?: string;
}

export interface LintRule {
  id: string;
  description: string;
  defaultSeverity: Severity;
  docsUrl: string;
  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[];
}
