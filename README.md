# n8nlint

Static analysis for n8n workflows — catch runtime bugs before production.

n8n workflows can contain subtle, non-deterministic bugs that only surface with specific data constellations. n8nlint analyzes workflow JSON files and detects these patterns before they cause issues in production.

## Installation

```bash
npm install -g n8nlint
```

Or use directly with npx:

```bash
npx n8nlint ./workflows/*.json
```

## Usage

```bash
# Lint a single workflow
n8nlint workflow.json

# Lint all workflows in a directory
n8nlint ./workflows/*.json

# JSON output for CI/CD
n8nlint --format json ./workflows/*.json

# Check exit code
n8nlint workflow.json && echo "PASS" || echo "FAIL"
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No errors (warnings/infos don't affect exit code) |
| `1` | One or more errors found |

## Rules

### `no-merge-in-loop` (error)

Detects Merge nodes inside `splitInBatches` loops. This causes the loop to silently halt after the first iteration because the Merge node waits for all inputs but only receives data from one branch per iteration.

**Fix:** Remove the Merge node and connect both branches directly to the next node. n8n supports multiple input connections on a single node input.

### `no-dead-end-in-subworkflow` (warning / info)

Detects multi-output nodes with unconnected outputs in sub-workflows. n8n returns data from the last executed node in a sub-workflow. Dead-end outputs can finish after the intended output node due to async execution, causing the parent workflow to receive wrong data.

| Pattern | Severity |
|---------|----------|
| `compareDatasets` with dead-end outputs | warning |
| `IF` / `Switch` with dead-end outputs | info |

**Fix:** Replace multi-output nodes with a single-output Code node that returns only the desired items.

### `no-dual-branch-convergence` (error)

Detects nodes with `onError: continueErrorOutput` where both the success and error branches converge on the same downstream node. When items split between branches, the downstream node fires twice — first with partial success data, then with partial error data.

**Fix:** Change `onError` from `continueErrorOutput` to `continueRegularOutput`. All items flow through one branch and downstream nodes fire only once.

## Configuration

Create a `.n8nlintrc.yml` in your project root:

```yaml
rules:
  no-merge-in-loop: error
  no-dead-end-in-subworkflow: warning
  no-dual-branch-convergence: error
```

Valid values: `error`, `warning`, `info`, `off`

## Inline Ignores

Add `n8nlint-ignore` to a node's name to skip it:

```
HTTP Request n8nlint-ignore
```

## GitHub Action

```yaml
- uses: jnikolov/n8nlint@v0
  with:
    patterns: './workflows/*.json'
```

## Programmatic API

```typescript
import { parseWorkflow, runRules, DEFAULT_CONFIG } from 'n8nlint';
import { readFileSync } from 'fs';

const workflow = JSON.parse(readFileSync('workflow.json', 'utf-8'));
const graph = parseWorkflow(workflow);
const violations = runRules(graph, workflow, DEFAULT_CONFIG);

for (const v of violations) {
  console.log(`[${v.severity}] ${v.message}`);
}
```

## License

MIT
