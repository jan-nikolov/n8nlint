import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation, Severity } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';

interface ApiProperty {
  key: string;
  severity: Severity;
  message: string;
}

const API_PROPERTIES: ApiProperty[] = [
  { key: 'active', severity: 'warning', message: 'Property "active" should be removed for version control — set via API separately.' },
  { key: 'triggerCount', severity: 'info', message: 'Property "triggerCount" is runtime metadata — not needed in version control.' },
  { key: 'staticData', severity: 'info', message: 'Property "staticData" is runtime state — can cause issues on API import.' },
  { key: 'pinData', severity: 'warning', message: 'Property "pinData" contains test data — may inflate file size unintentionally.' },
  { key: 'versionId', severity: 'info', message: 'Property "versionId" is server-internal state — not needed in version control.' },
];

export const apiCleanJson: LintRule = {
  id: 'api-clean-json',
  description: 'Workflow JSON contains properties not accepted by the n8n REST API.',
  defaultSeverity: 'warning',
  docsUrl: 'https://github.com/jnikolov/n8nlint#api-clean-json',

  detect(
    _graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const workflowName = workflow.name ?? 'Workflow';
    const raw = workflow as unknown as Record<string, unknown>;

    for (const { key, severity, message } of API_PROPERTIES) {
      if (raw[key] !== undefined) {
        violations.push({
          ruleId: 'api-clean-json',
          severity,
          message: `${workflowName}: ${message}`,
          nodeName: workflowName,
          fix: `Remove the "${key}" property from the workflow JSON before committing or API import.`,
        });
      }
    }

    return violations;
  },
};
