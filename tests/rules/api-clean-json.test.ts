import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { apiCleanJson } from '../../src/rules/api-clean-json.js';
import { parseWorkflow } from '../../src/parser/workflow-parser.js';
import type { N8nWorkflow } from '../../src/types/n8n-workflow.js';

function loadFixture(name: string): N8nWorkflow {
  const raw = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return JSON.parse(raw);
}

describe('api-clean-json', () => {
  it('should detect all API properties in bad fixture', () => {
    const workflow = loadFixture('api-clean-json-bad.json');
    const graph = parseWorkflow(workflow);
    const violations = apiCleanJson.detect(graph, workflow);

    expect(violations).toHaveLength(5);
    expect(violations.every((v) => v.ruleId === 'api-clean-json')).toBe(true);
    expect(violations[0].nodeName).toBe('API Properties (bad)');
    expect(violations[0].fix).toBeDefined();
  });

  it('should not flag clean workflow', () => {
    const workflow = loadFixture('api-clean-json-clean.json');
    const graph = parseWorkflow(workflow);
    const violations = apiCleanJson.detect(graph, workflow);

    expect(violations).toHaveLength(0);
  });

  it('should detect individual properties', () => {
    const workflow = {
      name: 'Test',
      active: false,
      nodes: [],
      connections: {},
    } as unknown as N8nWorkflow;

    const graph = parseWorkflow(workflow);
    const violations = apiCleanJson.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('active');
    expect(violations[0].severity).toBe('warning');
  });

  it('should flag empty pinData', () => {
    const workflow = {
      name: 'Test',
      pinData: {},
      nodes: [],
      connections: {},
    } as unknown as N8nWorkflow;

    const graph = parseWorkflow(workflow);
    const violations = apiCleanJson.detect(graph, workflow);

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('pinData');
  });

  it('should use workflow name in violations', () => {
    const workflow = {
      active: true,
      nodes: [],
      connections: {},
    } as unknown as N8nWorkflow;

    const graph = parseWorkflow(workflow);
    const violations = apiCleanJson.detect(graph, workflow);

    expect(violations[0].nodeName).toBe('Workflow');
  });
});
