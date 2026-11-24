# ADR-001: Electron over Tauri

## Status

Accepted

## Date

2026-11-22

## Context

We need a desktop application framework for Windows that can:
- Display a React-based UI
- Access local SQLite database
- Make HTTP requests to ISP servers
- Launch external applications (VLC, PotPlayer)
- Support auto-updates

Main candidates:
1. **Electron** — Chromium + Node.js runtime
2. **Tauri** — Rust backend + system WebView2
3. **.NET MAUI/WPF** — Native Windows framework

## Decision

Use **Electron + React + TypeScript**.

## Rationale

### Why not Tauri?

Tauri's main advantage is smaller bundle size (~15MB vs ~150MB). However:

1. **Same playback limitations** — Both use Chromium/WebView2, same codec issues
2. **We're using external players anyway** — Internal playback not needed
3. **Rust learning curve** — Team is JavaScript/TypeScript proficient
4. **Ecosystem maturity** — electron-builder, electron-updater, better-sqlite3 are battle-tested

### Why not .NET MAUI/WPF?

1. **External player strategy** — Native codec support is wasted since we launch VLC/PotPlayer
2. **React ecosystem** — Faster UI iteration with React vs XAML
3. **Cross-platform option** — If Mac version needed later, Electron supports it

### Why Electron wins

1. **Mature ecosystem** — Well-documented, huge community
2. **Fast development** — JavaScript/TypeScript, React, npm packages
3. **Good enough** — 150MB is acceptable for a media app
4. **Proven** — VS Code, Discord, Slack use Electron successfully

## Consequences

### Positive

- Faster development velocity
- Familiar tooling for JavaScript developers
- Rich ecosystem of packages
- Single codebase for potential multi-platform

### Negative

- Larger bundle size (~150MB)
- Higher memory baseline (~100-200MB)
- Must monitor Electron security advisories
- Chromium update cadence

### Neutral

- VLC/PotPlayer fallback still required (same as other options)

## Alternatives Considered

| Option | Bundle | Dev Speed | Codec Support | Verdict |
|--------|--------|-----------|---------------|---------|
| Electron | 150MB | Fast | N/A (external) | ✓ Selected |
| Tauri | 15MB | Medium | N/A (external) | Rejected — Rust overhead |
| .NET | 60MB | Medium | Full | Rejected — XAML slower |
