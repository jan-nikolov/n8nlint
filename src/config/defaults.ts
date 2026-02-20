import type { N8nLintConfig } from '../types/config.js';

export const DEFAULT_CONFIG: N8nLintConfig = {
  rules: {
    'no-merge-in-loop': 'error',
    'no-dead-end-in-subworkflow': 'warning',
    'no-dual-branch-convergence': 'error',
  },
};
