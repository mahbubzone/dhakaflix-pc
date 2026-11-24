# DhakaFlix Windows PC — Requirements Document

## 1. Project Brief

**Product:** DhakaFlix PC — a standalone Windows desktop application for browsing and streaming media from ISP-provided local servers (BDIX/FTP).

**Target platform:** Windows 10/11 desktop (64-bit), Electron + React + TypeScript + SQLite.

**Core value proposition:** Netflix-style catalogue and playback for ~38,000 ISP-hosted movies and series, with metadata enrichment, without requiring any external backend or account.

**Key constraints:**
- ISP servers are plain HTTP (172.16.x.x), no CORS, no API
- Must not overload shared ISP server (≤4 concurrent requests)
- Offline-capable database; no external dependencies at runtime except optional metadata

---

## 2. Requirements List

### 2.1 Core (MVP)

| ID | Requirement | Source |
|----|-------------|--------|
| C01 | Parse h5ai directory listings (fallback table: `fb-n`, `fb-d`, `fb-s` classes) | §1.2, §5.2 |
| C02 | Parse nginx autoindex listings (`<a href>` + date/size) | §1.2 |
| C03 | Parse Apache autoindex listings (table rows) | §1.2 |
| C04 | Configure multiple category URLs across different hosts | §1.1, §5.1 |
| C05 | Detect movie folders by pattern: `Title (Year) Quality [Dual Audio]/` | §1.3, §5.3 |
| C06 | Detect TV series folders by pattern: `Show (TV Series YYYY–YYYY)/Season N/` | §1.3, §6 |
| C07 | Detect wrestling/event folders: `Event (DD-MM-YYYY)/` | §1.3, §5.3 |
| C08 | Detect collection folders (year range) as groups, not titles | §1.3, §5.3 |
| C09 | Incremental crawling: store folder mtime, re-scan only changed groups | §5.4 |
| C10 | Limit crawler to 4 concurrent HTTP requests | §1.4, §5.4 |
| C11 | Group folders walked, title folders stored without opening | §5.4 |
| C12 | Lazy-load video URL and poster on first view | §5.4 |
| C13 | Mark-and-sweep: delete titles removed from server | §5.4 |
| C14 | SQLite database with WAL mode | §5.5 |
| C15 | `movies` table: href, parent, category, title, year, quality, dual, added, poster, video, size, position, duration, watched, seen, kind | §5.5 |
| C16 | `dirs` table for incremental scan state | §5.5 |
| C17 | `progress` table for episode playback state | §5.5 |
| C18 | `meta` table for cached Cinemeta JSON | §5.5 |
| C19 | Composite index on (category, added) for fast queries | §5.5, Troubleshooting |
| C20 | Side navigation drawer with category list | §8.1 |
| C21 | Tab row for sections within a category | §8.2 |
| C22 | Poster grid/rows with lazy loading | §8.3 |
| C23 | Detail page with title, year, quality, play/resume buttons | §8, §11 |
| C24 | Search functionality across all titles | §8 |
| C25 | HTTP video streaming with Range request support (seeking) | §1.4, §9 |
| C26 | Support H.264/HEVC video, AAC audio | §1.4 |
| C27 | Multiple audio track selection (prefer English) | §1.4, §9 |
| C28 | Embedded subtitle support (SRT) | §1.4, §9 |
| C29 | Save playback position every 15 seconds | §9 |
| C30 | Resume playback from saved position | §9, §11 |
| C31 | Mark as watched at >95% position | §9 |
| C32 | Episode browser for TV series (seasons, episodes) | §6, §11 |
| C33 | Auto-advance to next episode | §6, §9 |
| C34 | Show progress indicator on poster/card | §11 |

### 2.2 Enhanced (in guide, secondary priority)

| ID | Requirement | Source |
|----|-------------|--------|
| E01 | Cinemeta integration: search by title | §7 |
| E02 | Cinemeta integration: fetch IMDb rating, plot, genres, runtime, cast, director | §7 |
| E03 | Cinemeta integration: fetch backdrop image | §7 |
| E04 | Cinemeta integration: fetch title logo | §7 |
| E05 | Cache Cinemeta responses forever, fetch only after 350ms focus settle | §7 |
| E06 | Display IMDb badge on rating | §7 |
| E07 | Hero area with backdrop, logo, metadata on focus | §8.4, §11 |
| E08 | Dark logo detection and tinting (luminance check) | §7, Troubleshooting |
| E09 | Backdrop anchored at 74% width, 16:9 aspect, faded edges | §8.4 |
| E10 | Scrims for legibility (hero text, tab row, poster rows) | §8.4 |
| E11 | Focus treatment: ring + scale animation | §8.3 |
| E12 | Tab switches on focus after 280ms dwell | §8.2 |
| E13 | Focus memory: return to same card after Back | §8.3 |
| E14 | Pivot scrolling (focused row snaps to top) | §8.3 |
| E15 | Gradient fade on row edges to prevent mid-word cutoff | §8.2 |
| E16 | Open in VLC fallback for DTS/unsupported codecs | §9, Troubleshooting |
| E17 | Series: land on last watched season, offer Resume/Play next | §6, §11 |
| E18 | Episode thumbnails from Cinemeta | §7 |
| E19 | Large font accessibility support | §8.4, §11 |

### 2.3 Desktop-Specific (new for Windows)

| ID | Requirement | Source |
|----|-------------|--------|
| D01 | Electron shell for Windows 10/11 | Context |
| D02 | React + TypeScript frontend | Context |
| D03 | better-sqlite3 or sql.js for SQLite in Electron | Context |
| D04 | Mouse + keyboard navigation (not D-pad focused) | Context |
| D05 | Window resize and maximize support | Context |
| D06 | Responsive layout for various window sizes | Context |
| D07 | Native file system access for database storage | Context |
| D08 | System tray / minimize to tray (optional) | Context |
| D09 | Installer (NSIS or Squirrel) | Context |
| D10 | Auto-update mechanism (OTA) | Context |
| D11 | Chromium media playback (or external player integration) | Context |
| D12 | Keyboard shortcuts (space=pause, arrows=seek, F=fullscreen) | Context |
| D13 | Remember window size and position | Context |
| D14 | Native context menus | Context |
| D15 | Tooltip on hover for truncated titles | Context |

---

## 3. Requirements Traceability Matrix

| Requirement | Guide Section | Implementation Area |
|-------------|---------------|---------------------|
| C01-C03 | §1.2, §5.2 | Crawler/Parser |
| C04 | §1.1, §5.1 | Configuration |
| C05-C08 | §1.3, §5.3 | Title Regex |
| C09-C13 | §5.4 | Crawler Logic |
| C14-C19 | §5.5 | Database |
| C20-C24 | §8 | UI Shell |
| C25-C31 | §1.4, §9 | Player |
| C32-C34 | §6, §9 | Series/Progress |
| E01-E08 | §7 | Metadata |
| E09-E15 | §8 | UI Polish |
| E16-E19 | §6, §9 | Player/Series |
| D01-D15 | N/A (new) | Electron/Desktop |

---

## 4. Scope Definition

### 4.1 In Scope (v1)

1. **Crawler:** h5ai, nginx, Apache parsing; incremental scan; concurrency limit
2. **Database:** SQLite with all tables, WAL mode, indexes
3. **Catalogue UI:** Navigation drawer, category tabs, poster grid, detail page, search
4. **Playback:** Chromium-native video player, progress tracking, resume, audio/subtitle selection
5. **Series:** Season/episode browser, progress per episode, auto-advance
6. **Metadata:** Cinemeta integration with caching
7. **Desktop:** Electron app, window management, keyboard shortcuts
8. **Distribution:** Windows installer

### 4.2 Out of Scope / Deferred

| Item | Reason |
|------|--------|
| macOS/Linux builds | Platform focus; can add later |
| User accounts / sync | Standalone per guide; local-only |
| Transcoding | Direct streaming; server provides compatible formats |
| Download / offline viewing | Not in guide; legal complexity |
| Chromecast / DLNA | TV app handles casting |
| Custom themes | Polish phase; not MVP |
| Parental controls | Not specified |
| Watch history export | Enhancement |
| Multiple profiles | Single-user focus |
| Server auto-discovery | IPs configured manually |

### 4.3 Assumptions

| # | Assumption |
|---|------------|
| A1 | User has network access to 172.16.x.x ISP servers |
| A2 | ISP servers support HTTP Range requests |
| A3 | Video files are H.264/HEVC with AAC audio (most common) |
| A4 | User's Windows PC has internet access for Cinemeta |
| A5 | ~38,000 titles is upper bound; database can handle this |
| A6 | User provides category URLs during initial setup |
| A7 | Electron's Chromium can play .mkv via MSE/native codecs or needs ffmpeg integration |
| A8 | ISP folder structure follows patterns in guide |

---

## 5. Milestone Breakdown

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Project scaffold, crawler, database operational.

| Task | Deliverable |
|------|-------------|
| 1.1 | Electron + React + TS project setup |
| 1.2 | SQLite integration (better-sqlite3) |
| 1.3 | Database schema creation with migrations |
| 1.4 | h5ai parser with unit tests |
| 1.5 | nginx autoindex parser |
| 1.6 | Apache autoindex parser |
| 1.7 | Title regex (movie, series, event, collection) with tests |
| 1.8 | Crawler core: walk groups, detect titles |
| 1.9 | Incremental scan logic (mtime comparison) |
| 1.10 | Concurrency limiter (semaphore) |
| 1.11 | Mark-and-sweep deletion |
| 1.12 | Category configuration system |

### Phase 2: Catalogue UI (Weeks 3-4)

**Goal:** Browse and search the library.

| Task | Deliverable |
|------|-------------|
| 2.1 | App shell: sidebar + main content area |
| 2.2 | Category navigation |
| 2.3 | Tab row component |
| 2.4 | Poster card component |
| 2.5 | Virtualized poster grid (large dataset) |
| 2.6 | Lazy-load poster images from ISP |
| 2.7 | Detail page layout |
| 2.8 | Search with debounced input |
| 2.9 | Loading states and error handling |
| 2.10 | Window resize and responsive layout |

### Phase 3: Playback (Weeks 5-6)

**Goal:** Watch movies and series with progress tracking.

| Task | Deliverable |
|------|-------------|
| 3.1 | Video player component (Chromium/HTML5) |
| 3.2 | Range request support verification |
| 3.3 | Play/pause/seek controls |
| 3.4 | Audio track selector |
| 3.5 | Subtitle track selector |
| 3.6 | Progress save (15s interval) |
| 3.7 | Resume from saved position |
| 3.8 | Mark watched at 95% |
| 3.9 | Episode browser (seasons, episodes) |
| 3.10 | Auto-advance episodes |
| 3.11 | Keyboard shortcuts |
| 3.12 | VLC fallback launcher |

### Phase 4: Polish & Distribution (Weeks 7-8)

**Goal:** Metadata, UI refinements, installer.

| Task | Deliverable |
|------|-------------|
| 4.1 | Cinemeta search integration |
| 4.2 | Cinemeta detail fetch (rating, plot, etc.) |
| 4.3 | Metadata caching with 350ms settle delay |
| 4.4 | Hero area with backdrop |
| 4.5 | IMDb badge and attribution |
| 4.6 | Focus/hover states refined |
| 4.7 | Progress indicators on cards |
| 4.8 | Window state persistence |
| 4.9 | Settings page (category URLs) |
| 4.10 | NSIS/Squirrel installer |
| 4.11 | Auto-update mechanism |
| 4.12 | Final testing and bug fixes |

---

## 6. Acceptance Criteria

### 6.1 Crawler

| Criterion | Test |
|-----------|------|
| AC-C01 | h5ai listing parsed correctly: all entries extracted with href, name, date, size |
| AC-C02 | nginx listing parsed correctly |
| AC-C03 | Apache listing parsed correctly |
| AC-C04 | Movie folder regex matches `72 Hours (2026) 720p NF [Dual Audio]` → title="72 Hours", year=2026, quality="720p", dual=true |
| AC-C05 | Series folder regex matches `A Discovery of Witches (TV Series 2018–2022) 1080p/` → kind=series |
| AC-C06 | Collection folder `(2008-2019)` detected as group, not title |
| AC-C07 | Incremental scan: unchanged folder not re-fetched (mtime comparison) |
| AC-C08 | Concurrent requests never exceed 4 (verified via logging/instrumentation) |
| AC-C09 | Deleted titles removed after mark-and-sweep |
| AC-C10 | Full crawl of test category completes without error |

### 6.2 Database

| Criterion | Test |
|-----------|------|
| AC-D01 | WAL mode enabled: `PRAGMA journal_mode` returns `wal` |
| AC-D02 | All tables created with correct schema |
| AC-D03 | Index on (category, added) exists |
| AC-D04 | 38,000 title inserts complete in <30 seconds |
| AC-D05 | Query by category returns in <100ms |

### 6.3 UI — Catalogue

| Criterion | Test |
|-----------|------|
| AC-U01 | App launches within 5 seconds |
| AC-U02 | Sidebar shows all categories |
| AC-U03 | Selecting category loads poster grid |
| AC-U04 | Grid scrolls smoothly with 1000+ items (virtualization) |
| AC-U05 | Clicking poster opens detail page |
| AC-U06 | Back button returns to previous view, same scroll position |
| AC-U07 | Search returns relevant results within 500ms |
| AC-U08 | Empty state shown when no results |

### 6.4 Playback

| Criterion | Test |
|-----------|------|
| AC-P01 | Click Play starts video playback |
| AC-P02 | Seeking via slider or arrow keys works |
| AC-P03 | Audio track can be changed mid-playback |
| AC-P04 | Subtitles can be enabled/disabled |
| AC-P05 | Position saved after 15 seconds of playback |
| AC-P06 | Resuming starts from saved position (±2 seconds) |
| AC-P07 | At >95% position, movie marked as watched |
| AC-P08 | Episode auto-advances to next |
| AC-P09 | "Open in VLC" launches VLC with correct URL |

### 6.5 Metadata

| Criterion | Test |
|-----------|------|
| AC-M01 | Cinemeta search returns results for known title |
| AC-M02 | Metadata cached to database |
| AC-M03 | Cached metadata used on subsequent views (no network call) |
| AC-M04 | IMDb rating displayed with badge |
| AC-M05 | Backdrop image loads and displays |

### 6.6 Desktop

| Criterion | Test |
|-----------|------|
| AC-E01 | Window can be resized, minimized, maximized |
| AC-E02 | Window size/position restored on restart |
| AC-E03 | Keyboard shortcuts work (Space=pause, F=fullscreen, Esc=exit fullscreen) |
| AC-E04 | Installer creates working app on clean Windows 10 machine |
| AC-E05 | App can check for and apply updates |

---

## 7. Open Questions

| # | Question | Impact | Decision Owner |
|---|----------|--------|----------------|
| Q1 | Which video player: Chromium-native, video.js, or embedded mpv? | Codec support, DTS playback, complexity | User/Architect |
| Q2 | MKV support: Does Chromium play MKV natively, or need ffmpeg.wasm/remuxing? | Playback feasibility | Architect |
| Q3 | How to handle DTS audio: transcode on-the-fly, or VLC-only fallback? | User experience | User |
| Q4 | Settings storage: JSON file, SQLite, or electron-store? | Implementation | Dev team |
| Q5 | Auto-update: electron-updater with GitHub releases, or custom server? | Infrastructure | User |
| Q6 | First-run wizard: guided category URL entry, or just settings page? | UX | User |
| Q7 | Should app run on startup / system tray? | User preference | User |
| Q8 | Poster image preference: any `.jpg`, or specifically `_AL_` pattern? | Guide says prefer `_AL_` | Confirm from guide |
| Q9 | Minimum Windows version: Windows 10 only, or include Windows 8.1? | Distribution | User |
| Q10 | Should "Continue Watching" row exist on home screen? | UX | User |
| Q11 | Offline mode behavior: show cached data or error? | UX when ISP unreachable | User |
| Q12 | How to handle very long titles in grid? | Truncate + tooltip, or wrap? | User/Design |

---

## 8. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | MKV playback issues in Chromium | Medium | High | Evaluate early; have mpv/VLC fallback ready |
| R2 | ISP changes folder structure or URLs | Low | High | Configurable parsers; regex in settings |
| R3 | Cinemeta API changes or goes offline | Low | Medium | Cache aggressively; degrade gracefully |
| R4 | 38k titles causes UI performance issues | Medium | Medium | Virtualized lists; paginated queries |
| R5 | Some videos have unsupported codecs (DTS) | Known | Medium | VLC fallback button |
| R6 | ISP server unresponsive/slow | Medium | Medium | Timeout handling; retry with backoff |
| R7 | SQLite write contention (scan + UI) | Low | Low | WAL mode (already required) |

---

## 9. Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Electron | 28+ | Desktop shell |
| React | 18+ | UI framework |
| TypeScript | 5+ | Type safety |
| better-sqlite3 | 9+ | SQLite for Node/Electron |
| Cinemeta API | v3 | Metadata (no key needed) |
| video.js or HTML5 video | - | Playback |
| electron-builder | - | Packaging/installer |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| h5ai | PHP-based directory listing software |
| BDIX | Bangladesh Internet Exchange |
| Cinemeta | Stremio's free metadata API |
| WAL | Write-Ahead Logging (SQLite mode) |
| mtime | Modification timestamp |
| Mark-and-sweep | Deletion strategy: stamp seen items, delete unstamped |
| Range request | HTTP partial content request for seeking |

---

*Document version: 1.0*  
*Generated: 2026-11-22*  
*Source: DhakaFlix Build Guide (Android TV)*
