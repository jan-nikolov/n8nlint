import type { N8nLintConfig } from '../types/config.js';

export const DEFAULT_CONFIG: N8nLintConfig = {
  rules: {
    'no-merge-in-loop': 'error',
    'no-dead-end-in-subworkflow': 'warning',
    'no-dual-branch-convergence': 'error',
    'no-unreachable-nodes': 'warning',
    'splitInBatches-missing-loop-back': 'error',
    'http-no-error-handling': 'info',
    'code-node-no-require': 'error',
    'code-node-no-env': 'error',
    'code-node-no-credential-helpers': 'error',
    'api-clean-json': 'warning',
    'large-inline-code': 'info',
    'merge-mode-ambiguity': 'info',
    'prefer-named-node-reference': 'warning',
    'binary-needs-decode-before-upload': 'warning',
  },
};
