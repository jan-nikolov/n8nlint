import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { codeNodeNoCredentialHelpers } from '../../src/rules/code-node-no-credential-helpers.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('code-node-no-credential-helpers', () => {
  it('should detect credential helpers in Code node', () => {
    const workflow = loadFixture('code-credentials-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoCredentialHelpers.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('code-node-no-credential-helpers');
    expect(violations[0].severity).toBe('error');
    expect(violations[0].nodeName).toBe('API Call');
    expect(violations[0].message).toContain('this.getCredentials()');
    expect(violations[0].message).toContain('this.helpers.httpRequestWithAuthentication()');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag clean Code node', () => {
    const workflow = loadFixture('code-credentials-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoCredentialHelpers.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should detect individual methods', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'OAuth', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode: "await this.helpers.requestOAuth2.call(this, 'myApi', opts);" } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'OAuth', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoCredentialHelpers.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('this.helpers.requestOAuth2()');
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Code n8nlint-ignore', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode: "await this.getCredentials('api');" } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Code n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = codeNodeNoCredentialHelpers.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });
});
