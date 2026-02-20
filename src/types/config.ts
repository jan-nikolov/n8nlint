import type { Severity } from './rule.js';

export type RuleSetting = Severity | 'off';

export interface N8nLintConfig {
  rules: Record<string, RuleSetting>;
}
