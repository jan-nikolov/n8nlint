# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compile (tsc -p tsconfig.build.json) → dist/
npm run typecheck      # Type check without emit (tsc --noEmit)
npm test               # Run all tests (vitest run)
npm run test:watch     # Tests in watch mode
npm run test:coverage  # Tests with V8 coverage

# Run a single test file
npx vitest tests/rules/no-merge-in-loop.test.ts

# Run a specific test by name
npx vitest tests/rules/no-merge-in-loop.test.ts -t "should detect merge node"

# Run the CLI in development
npx tsx src/cli.ts ./workflows/*.json
npx tsx src/cli.ts --format json ./workflows/*.json
```

## Architecture

n8nlint is a static analysis linter for n8n workflow JSON files. It detects non-deterministic race condition bugs that only surface at runtime with specific data constellations.

### Data Flow

```
workflow.json → parseWorkflow() → graphology MultiDirectedGraph → LintRule[].detect() → RuleViolation[] → Reporter
```

### Core Modules

- **`src/parser/workflow-parser.ts`** — Converts n8n JSON to a directed graph using `graphology`. Nodes = workflow nodes (keyed by name), edges = connections. Disabled nodes and non-`main` connections are excluded.
- **`src/engine/rule-engine.ts`** — Orchestrates rule execution. `runRules()` applies config-based severity overrides and returns violations. `getAllRules()` returns the rule registry.
- **`src/graph/graph-utils.ts`** — Graph traversal algorithms: BFS reachability (forward/reverse), loop body detection (intersection of forward & reverse reachable sets from splitInBatches), branch convergence detection (intersection of downstream sets from two branches).
- **`src/rules/`** — Each rule implements `LintRule` interface with `id`, `description`, `defaultSeverity`, `docsUrl`, and `detect(graph, workflow)`.
- **`src/config/config-loader.ts`** — Searches for `.n8nlintrc.{yml,yaml,json}` from cwd upward to filesystem root, merges with defaults.
- **`src/reporters/`** — `terminal-reporter.ts` (colored output with severity icons) and `json-reporter.ts` (structured JSON for CI/CD).
- **`src/cli.ts`** — CLI entry point using Commander.js. Exit code 1 only when violations with severity `error` exist.

### Current Rules

| Rule ID | Default Severity | Detects |
|---------|-----------------|---------|
| `no-merge-in-loop` | error | Merge nodes inside splitInBatches loops |
| `no-dead-end-in-subworkflow` | warning/info | Dead-end outputs in sub-workflows |
| `no-dual-branch-convergence` | error | Error branches converging on downstream nodes |
| `no-unreachable-nodes` | warning | Nodes without incoming connections (except triggers) |
| `splitInBatches-missing-loop-back` | error | splitInBatches loop without path back to split node |
| `http-no-error-handling` | info | HTTP Request nodes without onError configuration |

## Adding a New Rule

1. Create `src/rules/<rule-id>.ts` implementing `LintRule` interface
2. Export from `src/rules/index.ts`
3. Register in `ALL_RULES` array in `src/engine/rule-engine.ts`
4. Add default severity in `src/config/defaults.ts`
5. Export from `src/index.ts` (public API)
6. Create fixture pair in `tests/fixtures/`: `<name>-bad.json` / `<name>-clean.json`
7. Create test in `tests/rules/<rule-id>.test.ts`
8. Update rule count assertion in `tests/engine/rule-engine.test.ts`
9. Verify existing "clean" fixtures don't trigger the new rule

## Graph Utilities (`src/graph/graph-utils.ts`)

Available functions for rule implementations:

```typescript
// BFS forward reachability — optionally filter by output index
getReachableNodes(graph, start, options?: { fromOutputIndex?: number }): Set<string>

// BFS reverse reachability — all nodes that can reach target
getReverseReachableNodes(graph, target): Set<string>

// Loop body = intersection of forward from output 0 and reverse to split node
getLoopBody(graph, splitNodeName): Set<string>

// Nodes reachable from BOTH output branches of a source node
findConvergenceNodes(graph, sourceNode, outputIndexA, outputIndexB): Set<string>

// Check if workflow has an executeWorkflowTrigger node
isSubWorkflow(graph): boolean

// Find all nodes of a given type
findNodesByType(graph, nodeType): string[]

// Check if a specific output index has outgoing edges
outputHasConnections(graph, nodeName, outputIndex): boolean
```

**`onError` resolution:** The `onError` value is resolved during parsing from both node-level (`node.onError`) and parameters-level (`node.parameters.onError`) and stored in `NodeAttributes.onError`. Rules should read `attrs.onError` from the graph, not from the raw workflow JSON.

## Conventions

- **Rule IDs:** kebab-case (`no-merge-in-loop`)
- **Node type constants:** Fully qualified n8n type strings (e.g., `n8n-nodes-base.splitInBatches`)
- **Ignore marker:** Nodes with `n8nlint-ignore` (case-insensitive) in their name are skipped by rules
- **ESM only:** The package uses `"type": "module"` with ES2022 target
- **Config filenames:** `.n8nlintrc.yml`, `.n8nlintrc.yaml`, `.n8nlintrc.json`

## Testing

- Tests use Vitest with `describe()`/`it()` pattern
- Fixtures in `tests/fixtures/` — paired clean/bad JSON workflow files per rule
- Test helper `loadFixture(name)` reads and parses fixture files
- CLI tests use `execFileSync` with `npx tsx` to run the CLI as a subprocess
- Coverage excludes `src/cli.ts` (integration-tested via subprocess)
- **Gotcha:** When adding rules, existing "clean" fixtures may trigger new rules (e.g., an HTTP node without `onError`). Always run `npm test` after registering a new rule.

## Project Docs

- **`docs/plans/`** — Design documents and evolution plans for the project

## Releasing

1. Bump version in `package.json`
2. Commit and tag: `git tag v<version>`
3. Push with tags: `git push origin main --tags`
4. GitHub Actions release workflow auto-publishes to npm via OIDC Trusted Publishing
