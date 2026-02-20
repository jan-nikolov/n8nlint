/**
 * n8n Workflow JSON types — minimal subset needed for linting.
 */

export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

/** connections[sourceName].main[outputIndex] = N8nConnection[] */
export type N8nConnectionMap = Record<
  string,
  { main: N8nConnection[][]; [key: string]: N8nConnection[][] }
>;

export interface N8nNodeParameters {
  onError?: string;
  [key: string]: unknown;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: N8nNodeParameters;
  disabled?: boolean;
  onError?: string;
}

export interface N8nWorkflow {
  id?: string;
  name?: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: N8nConnectionMap;
  settings?: Record<string, unknown>;
  pinData?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  tags?: unknown[];
}
