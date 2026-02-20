# n8nlint

Static analysis for n8n workflows — like ESLint for your automation pipelines.

n8n workflows can contain subtle bugs that only surface at runtime with specific data constellations: race conditions, dead branches, missing loop-backs, unhandled errors. n8nlint analyzes workflow JSON files and catches these patterns before they cause issues in production.

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

### `no-unreachable-nodes` (warning)

Detects nodes without incoming connections (excluding trigger nodes). Unreachable nodes will never execute and are likely leftover from workflow edits.

**Fix:** Connect the node to the workflow or remove it if unused.

### `splitInBatches-missing-loop-back` (error)

Detects `splitInBatches` loops where the loop body has no path back to the split node. Without this connection, only the first batch is processed and the rest of the data is silently dropped.

**Fix:** Connect the last node in the loop body back to the `splitInBatches` node to complete the loop.

### `http-no-error-handling` (info)

Detects HTTP Request nodes without an `onError` configuration. Without error handling, any HTTP error (timeout, 4xx, 5xx) will stop the entire workflow execution.

**Fix:** Set `onError` to `continueRegularOutput` or `continueErrorOutput` to handle HTTP errors gracefully.

## Configuration

Create a `.n8nlintrc.yml` in your project root:

```yaml
rules:
  no-merge-in-loop: error
  no-dead-end-in-subworkflow: warning
  no-dual-branch-convergence: error
  no-unreachable-nodes: warning
  splitInBatches-missing-loop-back: error
  http-no-error-handling: info
```

Valid values: `error`, `warning`, `info`, `off`

## Inline Ignores

Add `n8nlint-ignore` to a node's name to skip it:

```
HTTP Request n8nlint-ignore
```

## GitHub Action

```yaml
- uses: jnikolov/n8nlint@v0.2.0
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

## Roadmap

- **v0.3** — Auto-layout and formatting (Prettier for n8n)
- **v0.4** — Expression analysis rules (invalid references, type mismatches)
- **v0.5** — n8n API integration (lint workflows directly from n8n instances)

## Disclaimer

n8nlint is an independent open-source project. It is **not affiliated with, endorsed by, or sponsored by n8n GmbH**.

## License

MIT
