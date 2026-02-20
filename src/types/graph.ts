export interface NodeAttributes {
  nodeType: string;
  typeVersion: number;
  onError?: string;
  outputCount: number;
}

export interface EdgeAttributes {
  outputIndex: number;
  inputIndex: number;
}
