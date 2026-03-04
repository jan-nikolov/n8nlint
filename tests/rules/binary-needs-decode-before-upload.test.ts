import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { binaryNeedsDecodeBeforeUpload } from '../../src/rules/binary-needs-decode-before-upload.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('binary-needs-decode-before-upload', () => {
  it('should detect upload without binary decoding', () => {
    const workflow = loadFixture('binary-decode-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = binaryNeedsDecodeBeforeUpload.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('binary-needs-decode-before-upload');
    expect(violations[0].severity).toBe('warning');
    expect(violations[0].nodeName).toBe('Upload to Drive');
    expect(violations[0].relatedNodes).toContain('Download PDF');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag when Code node is between HTTP and upload', () => {
    const workflow = loadFixture('binary-decode-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = binaryNeedsDecodeBeforeUpload.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag HTTP without file response format', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: { responseFormat: 'json' }, onError: 'continueRegularOutput' },
        { id: '3', name: 'Drive', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [400, 0], parameters: { operation: 'upload' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] },
        HTTP: { main: [[{ node: 'Drive', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = binaryNeedsDecodeBeforeUpload.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag upload without HTTP ancestor', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'Drive', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [200, 0], parameters: { operation: 'upload' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Drive', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = binaryNeedsDecodeBeforeUpload.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should not flag non-upload operation', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: { responseFormat: 'file' }, onError: 'continueRegularOutput' },
        { id: '3', name: 'Drive', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [400, 0], parameters: { operation: 'download' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] },
        HTTP: { main: [[{ node: 'Drive', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = binaryNeedsDecodeBeforeUpload.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should skip nodes with n8nlint-ignore marker', () => {
    const workflow: N8nWorkflow = {
      nodes: [
        { id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        { id: '2', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: { responseFormat: 'file' }, onError: 'continueRegularOutput' },
        { id: '3', name: 'Drive n8nlint-ignore', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [400, 0], parameters: { operation: 'upload' } },
      ],
      connections: {
        Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] },
        HTTP: { main: [[{ node: 'Drive n8nlint-ignore', type: 'main', index: 0 }]] },
      },
    };

    const graph = parseWorkflow(workflow);
    const violations = binaryNeedsDecodeBeforeUpload.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });
});
