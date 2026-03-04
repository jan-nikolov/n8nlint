import type { MultiDirectedGraph } from 'graphology';
import type { LintRule, RuleViolation } from '../types/rule.js';
import type { N8nWorkflow } from '../types/n8n-workflow.js';
import type { NodeAttributes, EdgeAttributes } from '../types/graph.js';
import { shouldIgnoreNode } from '../parser/workflow-parser.js';
import { getReachableNodes, getReverseReachableNodes } from '../graph/graph-utils.js';

const UPLOAD_NODE_TYPES: Record<string, string> = {
  'n8n-nodes-base.googleDrive': 'upload',
  'n8n-nodes-base.s3': 'upload',
  'n8n-nodes-base.ftp': 'upload',
};

const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';
const CODE_NODE = 'n8n-nodes-base.code';

export const binaryNeedsDecodeBeforeUpload: LintRule = {
  id: 'binary-needs-decode-before-upload',
  description: 'Upload nodes receiving binary data directly from HTTP Request may upload corrupted files.',
  defaultSeverity: 'warning',
  docsUrl: 'https://github.com/jnikolov/n8nlint#binary-needs-decode-before-upload',

  detect(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>,
    workflow: N8nWorkflow,
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    graph.forEachNode((uploadNodeName, attrs) => {
      const expectedOp = UPLOAD_NODE_TYPES[attrs.nodeType];
      if (!expectedOp) return;
      if (shouldIgnoreNode(uploadNodeName)) return;

      const uploadNode = workflow.nodes.find((n) => n.name === uploadNodeName);
      if (!uploadNode) return;
      if (uploadNode.parameters?.operation !== expectedOp) return;

      // Find all ancestors of this upload node
      const ancestors = getReverseReachableNodes(graph, uploadNodeName);

      for (const ancestor of ancestors) {
        const ancestorAttrs = graph.getNodeAttributes(ancestor);
        if (ancestorAttrs.nodeType !== HTTP_REQUEST) continue;

        const httpNode = workflow.nodes.find((n) => n.name === ancestor);
        if (!httpNode) continue;
        if (httpNode.parameters?.responseFormat !== 'file') continue;

        // HTTP with file response found — check for Code node in between
        const forwardFromHttp = getReachableNodes(graph, ancestor);
        const reverseToUpload = getReverseReachableNodes(graph, uploadNodeName);

        let hasCodeNodeOnPath = false;
        for (const n of forwardFromHttp) {
          if (n !== ancestor && n !== uploadNodeName && reverseToUpload.has(n)) {
            if (graph.getNodeAttributes(n).nodeType === CODE_NODE) {
              hasCodeNodeOnPath = true;
              break;
            }
          }
        }

        if (!hasCodeNodeOnPath) {
          violations.push({
            ruleId: 'binary-needs-decode-before-upload',
            severity: 'warning',
            message: `Upload node "${uploadNodeName}" receives binary data from HTTP Request "${ancestor}" without binary decoding — files may be corrupted (Base64-encoded).`,
            nodeName: uploadNodeName,
            relatedNodes: [ancestor],
            fix: 'Add a Code node between the HTTP Request and upload node to call getBinaryDataBuffer() and prepareBinaryData().',
          });
        }
      }
    });

    return violations;
  },
};
