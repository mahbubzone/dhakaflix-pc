# Decision Log

Index of all Architecture Decision Records (ADRs).

## Active Decisions

| ID | Title | Date | Status |
|----|-------|------|--------|
| [ADR-001](ADR-001-electron-over-tauri.md) | Electron over Tauri | 2026-11-22 | Accepted |
| [ADR-002](ADR-002-external-player-only.md) | External Player Only (VLC/PotPlayer) | 2026-11-22 | Accepted |

## Pending Decisions

| Topic | Options | Blocking |
|-------|---------|----------|
| Code signing | Purchase cert vs accept SmartScreen | Release |
| Worker thread for SQLite | Now vs post-MVP | Performance |

## Decision Template

When adding new ADR:

```markdown
# ADR-XXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Date
YYYY-MM-DD

## Context
What is the issue?

## Decision
What did we decide?

## Rationale
Why this choice?

## Consequences
What are the trade-offs?

## Alternatives Rejected
What else was considered?
```
