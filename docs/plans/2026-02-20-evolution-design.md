# Design: n8nlint Evolution — Lint + Suggest + Format

## Context

n8nlint v0.1.3 ist ein statischer Linter für n8n Workflow JSON-Dateien mit 3 Regeln, die non-deterministische Race-Condition-Bugs erkennen. Das Tool soll zu einem umfassenden Workflow-Toolkit erweitert werden — vergleichbar mit "ESLint + Prettier für n8n Workflows".

**Motivation:**
- Nutzer, die n8n Workflows via GitHub verwalten (CI/CD, Vibe-Coding mit LLMs, Team-Review), brauchen sowohl Bug-Detection als auch Optimierungshinweise und sauber formatierte Node-Positionen
- FlowLint (closed source) zeigt, dass der Markt existiert — n8nlint wird die Open-Source-Alternative
- n8n selbst validiert nur Format, keine semantischen Bugs
- LLMs beim Vibe-Coding erzeugen funktional korrekte aber visuell chaotische Workflows

**Zielgruppen & Use Cases:**
1. CI/CD Pipeline — Workflows in Git, Linter auf PRs
2. AI-Vibe-Coding — LLM erzeugt JSON, Linter validiert + formatiert vor Import
3. Team-Review — Export → Git → Review → Lint → Import
4. Live-Monitoring — n8n API → Linter prüft laufende Instanz (spätere Phase)

---

## Die drei Säulen

### Säule 1: Lint (Bug-Detection) — erweitern

Bestehende 3 Regeln + neue Regeln systematisch aus n8n's Execution Model abgeleitet.

**Neue Regel-Kandidaten (priorisiert):**

| Regel | Severity | Was sie erkennt |
|-------|----------|----------------|
| `no-unreachable-nodes` | warning | Nodes ohne eingehende Verbindungen (außer Trigger) |
| `no-disconnected-expression-ref` | error | `$node['X']` ohne Verbindung zu X im Graph |
| `splitInBatches-missing-loop-back` | error | Loop ohne Rückkante zum splitInBatches |
| `no-infinite-loop-risk` | warning | Loop ohne erkennbare Exit-Condition |
| `http-no-error-handling` | info | HTTP-Nodes ohne onError-Konfiguration |

### Säule 2: Suggest (Best Practices) — neu

Selbes `LintRule`-Interface, Default-Severity `info`.

- `executeWorkflow-hardcoded-id` — Hardcoded Workflow-IDs brechen bei Migration
- `large-inline-code` — Code-Nodes >100 Zeilen → Sub-Workflow empfehlen
- `merge-mode-ambiguity` — Merge ohne explizit konfigurierten Mode

### Säule 3: Format (Auto-Layout) — neu

`n8nlint format` räumt Node-Positionen auf. Nutzt `@dagrejs/dagre` (BSD-3-Clause) — selbes Algo wie n8n's "Tidy Up" Button. Kein `--fix` — Format ist ein separater Subcommand.

---

## Phasen

1. **v0.2** — 3 neue Lint-Regeln (`no-unreachable-nodes`, `splitInBatches-missing-loop-back`, `http-no-error-handling`)
2. **v0.3** — Auto-Layout / Format mit Dagre
3. **v0.4** — Expression-basierte Regeln
4. **v0.5** — n8n API Integration
