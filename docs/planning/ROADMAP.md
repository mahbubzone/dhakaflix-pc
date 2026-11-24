# DhakaFlix PC — Development Roadmap

## Phase 1: Foundation (Weeks 1-2)

### Goals
- Project scaffolding complete
- Database operational
- Basic crawler working
- IPC layer established

### Tasks

| Task | Days | Deliverable |
|------|------|-------------|
| Project scaffolding (Vite + Electron + React + TS) | 1 | Running dev environment |
| SQLite integration + schema + migrations | 2 | Database service |
| Crawler service (h5ai format first) | 3 | Can scan one server |
| IPC layer + typed API | 2 | Main ↔ Renderer communication |
| Basic UI shell (window, sidebar) | 2 | App frame visible |

### Exit Criteria
- [ ] App launches and displays window
- [ ] Can add a server URL
- [ ] Crawler scans and populates database
- [ ] Movie list displays from database

---

## Phase 2: Catalogue UI (Weeks 3-4)

### Goals
- Full browse experience
- All parser formats working
- Search functional

### Tasks

| Task | Days | Deliverable |
|------|------|-------------|
| nginx + Apache parsers | 2 | All three formats supported |
| Home screen with poster rows | 3 | Continue Watching, Recently Added, categories |
| Category grid view | 2 | Browse by category |
| Search with FTS5 | 2 | Instant search results |
| Virtual scrolling for large lists | 1 | Smooth scroll through 38K items |

### Exit Criteria
- [ ] All three directory formats parse correctly
- [ ] Home shows categorized rows
- [ ] Category view shows full grid
- [ ] Search returns results <200ms
- [ ] Scrolling 1000+ items is smooth

---

## Phase 3: Playback Integration (Weeks 5-6)

### Goals
- External player launching
- Progress tracking
- Series support

### Tasks

| Task | Days | Deliverable |
|------|------|-------------|
| VLC detection + launch with URL | 2 | Primary playback working |
| PotPlayer detection + fallback | 1 | Fallback player working |
| Progress save/resume logic | 2 | Manual mark watched, resume position |
| Detail page (movie) | 2 | Full movie info display |
| Series/episode handling | 3 | Season list, episode grid, next episode |

### Exit Criteria
- [ ] Click Play opens VLC/PotPlayer with correct URL
- [ ] User can mark as watched
- [ ] Resume position saved and displayed
- [ ] Series shows seasons and episodes
- [ ] "Continue Watching" row populated

---

## Phase 4: Polish & Distribution (Weeks 7-8)

### Goals
- Metadata enrichment
- Installer working
- OTA updates functional

### Tasks

| Task | Days | Deliverable |
|------|------|-------------|
| Cinemeta metadata integration | 2 | Posters, ratings, plots from IMDb |
| Hero section + detail page polish | 2 | Backdrop, logo, full metadata |
| Settings UI | 1 | Server management, preferences |
| electron-builder + NSIS installer | 2 | Single EXE installer |
| electron-updater + GitHub releases | 2 | OTA update flow |
| Testing + bug fixes | 1 | Stable release candidate |

### Exit Criteria
- [ ] Metadata fetches and displays
- [ ] Installer works on clean Windows PC
- [ ] Update downloads and installs correctly
- [ ] All critical bugs resolved

---

## Post-MVP Backlog

- Watchlist feature
- Keyboard shortcuts help overlay
- System tray minimize
- Multiple server profiles
- Import/export database
- Localization (Bengali)
- Dark/light theme toggle
- Worker thread for SQLite (if blocking becomes issue)
