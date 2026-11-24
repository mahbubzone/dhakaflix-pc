# DhakaFlix PC — Requirements

## 1. Core Requirements (MVP)

### 1.1 Discovery & Crawling

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-01 | Parse h5ai directory listings | Must |
| CR-02 | Parse nginx autoindex listings | Must |
| CR-03 | Parse Apache autoindex listings | Must |
| CR-04 | Extract movie title/year from folder name | Must |
| CR-05 | Extract TV series from folder pattern | Must |
| CR-06 | Extract wrestling/event from date pattern | Should |
| CR-07 | Distinguish collections (year ranges) as groups | Must |
| CR-08 | Limit crawler to 4 concurrent requests | Must |
| CR-09 | Incremental scan via folder mtime comparison | Must |
| CR-10 | Mark-and-sweep deletion of removed titles | Must |
| CR-11 | Lazy-load poster/video URL on first view | Should |

### 1.2 Database

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-12 | Store movies with: href, title, year, category, quality, kind | Must |
| CR-13 | Store dirs table for incremental scans | Must |
| CR-14 | Store progress table for playback resume | Must |
| CR-15 | Enable SQLite WAL mode | Must |
| CR-16 | Create composite index (category, added) | Must |
| CR-17 | Full-text search on titles (FTS5) | Must |

### 1.3 TV Series

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-18 | Handle TV series seasons as subfolders | Must |
| CR-19 | Parse episode numbers from S01E01 pattern | Must |
| CR-20 | Track per-episode progress | Must |
| CR-21 | Display next unwatched episode | Should |

### 1.4 Playback

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-22 | Launch VLC with media URL | Must |
| CR-23 | Launch PotPlayer as fallback | Must |
| CR-24 | Detect installed players at standard paths | Must |
| CR-25 | Prompt install if no player found | Must |
| CR-26 | Pass start position to external player | Should |
| CR-27 | Allow manual "Mark as Watched" | Must |
| CR-28 | Save/display resume position | Must |

### 1.5 User Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-29 | Display movie poster from folder | Must |
| CR-30 | Provide category browsing | Must |
| CR-31 | Provide search by title | Must |
| CR-32 | Show detail page with metadata | Must |
| CR-33 | Continue Watching row | Must |
| CR-34 | First-launch setup wizard | Must |

---

## 2. Enhanced Requirements

### 2.1 Metadata

| ID | Requirement | Priority |
|----|-------------|----------|
| ER-01 | Fetch Cinemeta metadata (IMDb rating, plot) | Should |
| ER-02 | Cache metadata locally | Should |
| ER-03 | Display IMDb rating with attribution | Should |
| ER-04 | Display genres, runtime, cast | Could |
| ER-05 | Handle dark logos with contrast detection | Could |

### 2.2 UI Polish

| ID | Requirement | Priority |
|----|-------------|----------|
| ER-06 | Hero section with backdrop | Should |
| ER-07 | Horizontal poster rows with scrolling | Must |
| ER-08 | Grid view per category | Must |
| ER-09 | Side drawer navigation | Must |
| ER-10 | Quality badge (720p/1080p/4K) | Should |
| ER-11 | Dual audio indicator | Should |

---

## 3. Desktop-Specific Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DR-01 | Electron main/renderer architecture | Must |
| DR-02 | Secure contextBridge IPC | Must |
| DR-03 | Keyboard navigation (arrows, Enter, Esc) | Must |
| DR-04 | Mouse hover/click interactions | Must |
| DR-05 | Resizable window (min 960×540) | Must |
| DR-06 | Custom window chrome (frameless) | Should |
| DR-07 | NSIS Windows installer | Must |
| DR-08 | electron-updater OTA updates | Must |
| DR-09 | %APPDATA% data storage | Must |
| DR-10 | Preserve data on app update | Must |
| DR-11 | Work without Node.js on target PC | Must |
| DR-12 | Prompt for VLC/PotPlayer if missing | Must |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
|--------|--------|
| Cold startup | <3 seconds |
| Search response | <200ms on 38K records |
| Initial scan (1000 titles) | <30 seconds |
| Memory usage (typical) | <500 MB |
| Memory usage (maximum) | <1 GB |

### 4.2 Compatibility

| Requirement | Target |
|-------------|--------|
| Windows version | 10 1903+, 11 |
| Architecture | x64 |
| External players | VLC 3.x+, PotPlayer |

### 4.3 Security

| Requirement | Implementation |
|-------------|----------------|
| Process isolation | nodeIntegration: false |
| IPC boundary | contextBridge only |
| URL validation | Whitelist 172.16.x.x + configured servers |
| No credentials stored | Public URLs only |

### 4.4 Reliability

| Requirement | Implementation |
|-------------|----------------|
| Database integrity | WAL mode + checkpoints |
| Network failure | Graceful retry with backoff |
| Crash recovery | Resume scan from last checkpoint |
