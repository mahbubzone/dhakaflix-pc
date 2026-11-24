# DhakaFlix PC — Project Brief

## Vision

Build DhakaFlix as a standalone Windows PC media catalogue and streaming application that discovers ISP-provided media servers, catalogues content, and provides Netflix-style browsing with direct playback via external players.

## Objectives

1. Replace browser-based folder navigation with cinematic UI
2. Enable resume, watchlist, and search across ~38,000 titles
3. Work standalone without external backend
4. Support incremental catalogue updates
5. Deliver via simple Windows installer

## Scope

### In Scope

- Windows 10/11 desktop application
- ISP server discovery (172.16.x.x range)
- h5ai, nginx autoindex, Apache autoindex parsing
- Local SQLite database
- Cinemeta metadata integration (optional)
- VLC / PotPlayer external playback
- OTA updates via GitHub Releases
- NSIS installer

### Out of Scope

- Mobile applications
- Internet streaming services
- FTP/SMB protocols
- Cloud sync
- User accounts / multi-user profiles
- Video transcoding
- Internal video playback (all playback external)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Electron + React + TypeScript | Mature ecosystem, fast iteration |
| Database | SQLite (better-sqlite3) | Local-first, WAL for concurrency |
| Video playback | VLC → PotPlayer (external) | Full codec support, simpler app |
| Code signing | Deferred | Budget constraint |
| Updates | GitHub Releases | Free, simple |
| First-run | Wizard with DhakaFlix preset | Quick start for most users |

## Target Users

- DhakaFlix / BDIX ISP subscribers in Bangladesh
- Users with VLC or PotPlayer installed
- Windows 10 1903+ or Windows 11

## Success Criteria

- Scan 38,000 titles in <10 minutes (initial)
- Incremental scan <30 seconds
- Search response <200ms
- Cold startup <3 seconds
- Memory usage <500MB typical

## Timeline

8 weeks to MVP across 4 phases:
1. Foundation (2 weeks)
2. Catalogue UI (2 weeks)
3. Playback Integration (2 weeks)
4. Polish & Distribution (2 weeks)
