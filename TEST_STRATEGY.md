# DhakaFlix Windows PC — Test Strategy & Acceptance Criteria

## 1. Test Strategy Overview

### 1.1 Testing Levels

| Level | Tools | Scope | When |
|-------|-------|-------|------|
| Unit | Jest + ts-jest | Parsers, regex, utilities, DB operations | Every commit |
| Integration | Jest + real SQLite | Crawler + DB, Search + DB, Player state | PR merge |
| E2E | Playwright (Electron) | Full user flows | Pre-release |
| Manual | Human tester | Real ISP, video quality, codec edge cases | Release candidate |

### 1.2 Test Environments

| Environment | Purpose | Dependencies |
|-------------|---------|--------------|
| Local Dev | Unit tests | Mocked network, in-memory SQLite |
| Integration | Integration tests | Real SQLite file, mock HTTP server |
| Staging | E2E automation | Built Electron app, mock ISP server |
| Production-like | Manual testing | VPN/ISP access to 172.16.x.x servers |

### 1.3 CI/CD Integration

```yaml
# GitHub Actions workflow
stages:
  - lint:     ESLint + Prettier check
  - unit:     Jest unit tests (parallel)
  - integ:    Jest integration tests (sequential)
  - build:    Electron build (Windows x64)
  - e2e:      Playwright against built app
  - package:  NSIS installer creation
```

**Gate criteria:**
- All unit tests pass
- Integration tests pass
- Build succeeds without warnings
- E2E smoke tests pass
- No high/critical security findings

---

## 2. Acceptance Criteria by Feature

### 2.1 First-Time Setup & Initial Scan

**Given** a fresh installation with no database  
**When** user launches the app for the first time  
**Then:**

- [ ] AC-SETUP-01: App displays setup wizard or settings page
- [ ] AC-SETUP-02: User can add category URLs (one per line or individual entries)
- [ ] AC-SETUP-03: URL validation rejects non-HTTP(S) or malformed URLs
- [ ] AC-SETUP-04: "Start Scan" initiates crawler
- [ ] AC-SETUP-05: Progress indicator shows: category name, folders scanned, titles found
- [ ] AC-SETUP-06: Scan completes without user intervention
- [ ] AC-SETUP-07: After scan, main UI shows populated categories
- [ ] AC-SETUP-08: Database created in `%APPDATA%/DhakaFlix/` with WAL mode
- [ ] AC-SETUP-09: Startup to usable UI: <5 seconds (after initial scan complete)

### 2.2 Browse Movies by Category

**Given** database contains movies in multiple categories  
**When** user navigates to a category  
**Then:**

- [ ] AC-BROWSE-01: Sidebar shows all configured categories
- [ ] AC-BROWSE-02: Clicking category loads poster grid within 500ms (cached)
- [ ] AC-BROWSE-03: Grid displays posters in descending "added" order (newest first)
- [ ] AC-BROWSE-04: Grid virtualized: smooth scroll with 1000+ items, no jank
- [ ] AC-BROWSE-05: Poster shows title, year, quality badge
- [ ] AC-BROWSE-06: Progress bar overlay on partially-watched movies
- [ ] AC-BROWSE-07: "Watched" indicator on completed movies
- [ ] AC-BROWSE-08: Lazy-load posters: visible posters load first
- [ ] AC-BROWSE-09: Failed poster loads show placeholder image
- [ ] AC-BROWSE-10: Hover/focus shows tooltip for truncated titles

### 2.3 Search for a Title

**Given** database contains 38,000+ titles  
**When** user types in search box  
**Then:**

- [ ] AC-SEARCH-01: Search box accessible via Ctrl+K or clicking search icon
- [ ] AC-SEARCH-02: Input debounced (300ms) before query fires
- [ ] AC-SEARCH-03: Results appear within 200ms of query
- [ ] AC-SEARCH-04: Results ranked by relevance (title match > partial match)
- [ ] AC-SEARCH-05: Results show across all categories
- [ ] AC-SEARCH-06: Each result shows: poster thumbnail, title, year, category
- [ ] AC-SEARCH-07: Clicking result navigates to detail page
- [ ] AC-SEARCH-08: Empty results show "No titles found for '{query}'"
- [ ] AC-SEARCH-09: Special characters handled: `'`, `"`, `-`, `&`, non-ASCII
- [ ] AC-SEARCH-10: Search clears when pressing Escape

### 2.4 Play a Movie (with Seeking)

**Given** user is on a movie detail page  
**When** user clicks "Play"  
**Then:**

- [ ] AC-PLAY-01: Video player opens in full window
- [ ] AC-PLAY-02: Video starts streaming within 5 seconds (warm connection)
- [ ] AC-PLAY-03: Seeking via progress bar works (Range request)
- [ ] AC-PLAY-04: Seeking via arrow keys: Left/Right = 10s, Ctrl+Left/Right = 60s
- [ ] AC-PLAY-05: Space bar toggles play/pause
- [ ] AC-PLAY-06: Volume control via up/down arrows or slider
- [ ] AC-PLAY-07: F key toggles fullscreen
- [ ] AC-PLAY-08: Escape exits fullscreen (or player if not fullscreen)
- [ ] AC-PLAY-09: Player shows: current time, duration, title
- [ ] AC-PLAY-10: Buffering indicator shown when rebuffering

### 2.5 Resume Playback

**Given** user previously watched a movie and stopped at 45:00 of 2:00:00  
**When** user returns to that movie's detail page  
**Then:**

- [ ] AC-RESUME-01: "Resume" button shown (not just "Play")
- [ ] AC-RESUME-02: Resume button shows timestamp: "Resume at 45:00"
- [ ] AC-RESUME-03: Clicking "Resume" starts playback at 45:00 (±2 seconds)
- [ ] AC-RESUME-04: "Play from start" option also available
- [ ] AC-RESUME-05: Position saved every 15 seconds during playback
- [ ] AC-RESUME-06: Position saved when player closes (paused or window closed)
- [ ] AC-RESUME-07: Positions under 10 seconds not saved (accidental clicks)

### 2.6 TV Series Episode Navigation

**Given** user opens a TV series detail page  
**When** viewing the series  
**Then:**

- [ ] AC-SERIES-01: Series page shows season selector (tabs or dropdown)
- [ ] AC-SERIES-02: Default to last-watched season (or Season 1 if new)
- [ ] AC-SERIES-03: Episode list shows: thumbnail, episode number, title
- [ ] AC-SERIES-04: Each episode shows individual progress bar
- [ ] AC-SERIES-05: Watched episodes marked with checkmark
- [ ] AC-SERIES-06: "Resume" shows on last-watched incomplete episode
- [ ] AC-SERIES-07: "Play next" shows after completing an episode
- [ ] AC-SERIES-08: Auto-advance to next episode when current ends
- [ ] AC-SERIES-09: Auto-advance stops at season end (option to continue)
- [ ] AC-SERIES-10: Episodes sorted by S##E## naturally (E2 before E10)

### 2.7 Metadata Display

**Given** movie has Cinemeta data cached  
**When** viewing detail page  
**Then:**

- [ ] AC-META-01: Backdrop image loads behind content
- [ ] AC-META-02: Title logo displayed (if available) instead of text title
- [ ] AC-META-03: Dark logos tinted for visibility (luminance check)
- [ ] AC-META-04: IMDb rating shown with IMDb badge
- [ ] AC-META-05: Plot/description displayed (max 3-4 lines, expandable)
- [ ] AC-META-06: Genres displayed as tags
- [ ] AC-META-07: Runtime displayed in hours:minutes
- [ ] AC-META-08: Cast and director displayed
- [ ] AC-META-09: Metadata fetch waits 350ms focus settle (no flicker)
- [ ] AC-META-10: Missing metadata shows graceful fallback (folder name, no rating)

### 2.8 External Player Fallback (VLC)

**Given** video has unsupported codec (DTS audio)  
**When** user tries to play  
**Then:**

- [ ] AC-VLC-01: "Open in VLC" button visible on detail page
- [ ] AC-VLC-02: Clicking launches VLC with correct URL and title
- [ ] AC-VLC-03: If VLC not installed, show download prompt
- [ ] AC-VLC-04: Progress NOT auto-saved from VLC (external player)
- [ ] AC-VLC-05: Codec detection: warn user before playback if DTS detected

### 2.9 Application Update (OTA)

**Given** a new version is available on update server  
**When** app checks for updates  
**Then:**

- [ ] AC-UPDATE-01: App checks for updates on startup (non-blocking)
- [ ] AC-UPDATE-02: Update notification shows version number and changelog
- [ ] AC-UPDATE-03: User can choose "Update now" or "Later"
- [ ] AC-UPDATE-04: Download shows progress indicator
- [ ] AC-UPDATE-05: Install requires app restart (user-initiated)
- [ ] AC-UPDATE-06: Database preserved across updates
- [ ] AC-UPDATE-07: Settings preserved across updates
- [ ] AC-UPDATE-08: Failed update shows error and allows retry
- [ ] AC-UPDATE-09: Rollback available if new version fails to start

### 2.10 Settings Management

**Given** user opens Settings page  
**When** managing configuration  
**Then:**

- [ ] AC-SETTINGS-01: Category URLs can be added/edited/removed
- [ ] AC-SETTINGS-02: "Rescan Library" triggers incremental scan
- [ ] AC-SETTINGS-03: "Full Rescan" clears and rebuilds database
- [ ] AC-SETTINGS-04: Default audio language preference (English/Hindi)
- [ ] AC-SETTINGS-05: Subtitle default (on/off)
- [ ] AC-SETTINGS-06: Theme preference (if implemented)
- [ ] AC-SETTINGS-07: VLC path configuration (auto-detect or manual)
- [ ] AC-SETTINGS-08: "About" shows version, build date
- [ ] AC-SETTINGS-09: "Clear watch history" with confirmation
- [ ] AC-SETTINGS-10: Settings persist across app restarts

---

## 3. Test Data Requirements

### 3.1 Mock Directory Listings

**h5ai format:**
```html
<!DOCTYPE html>
<html><head><title>/DHAKA-FLIX/English Movies/(2026)/</title></head>
<body>
<table id="fb-table">
<tr><td class="fb-n"><a href="/DHAKA-FLIX/English%20Movies/(2026)/72%20Hours%20(2026)%20720p%20NF%20%5BDual%20Audio%5D/">72 Hours (2026) 720p NF [Dual Audio]</a></td><td class="fb-d">2026-11-15 10:30</td><td class="fb-s">4500000</td></tr>
<tr><td class="fb-n"><a href="/DHAKA-FLIX/English%20Movies/(2026)/The%20Matrix%205%20(2026)%201080p/">The Matrix 5 (2026) 1080p</a></td><td class="fb-d">2026-11-14 08:00</td><td class="fb-s">8200000</td></tr>
</table>
</body></html>
```

**nginx autoindex format:**
```html
<html><head><title>Index of /movies/</title></head>
<body><h1>Index of /movies/</h1><hr><pre>
<a href="../">../</a>
<a href="72%20Hours%20(2026)%20720p/">72 Hours (2026) 720p/</a>               15-Nov-2026 10:30    -
<a href="movie.mkv">movie.mkv</a>                              15-Nov-2026 10:30    4.5G
</pre></body></html>
```

**Apache autoindex format:**
```html
<html><head><title>Index of /movies</title></head>
<body><h1>Index of /movies</h1>
<table>
<tr><td><a href="72%20Hours%20(2026)%20720p/">72 Hours (2026) 720p/</a></td><td>2026-11-15 10:30</td><td>-</td></tr>
</table>
</body></html>
```

### 3.2 Sample Movie Entries

| Folder Name | Expected Parse |
|-------------|----------------|
| `72 Hours (2026) 720p NF [Dual Audio]` | title="72 Hours", year=2026, quality="720p", dual=true |
| `001. The Shawshank Redemption (1994) 1080p` | title="The Shawshank Redemption", year=1994, quality="1080p" |
| `2.0 (2018) 720p` | title="2.0", year=2018, quality="720p" |
| `Don't Look Up (2021) 2160p` | title="Don't Look Up", year=2021, quality="2160p" |
| `Mission: Impossible – Dead Reckoning (2023)` | title="Mission: Impossible – Dead Reckoning", year=2023 |

### 3.3 Sample Series Entries

| Folder Name | Expected Parse |
|-------------|----------------|
| `A Discovery of Witches (TV Series 2018–2022) 1080p` | kind=series, title="A Discovery of Witches", year=2018 |
| `The Office (TV Series 2005-2013)` | kind=series, title="The Office", year=2005 |
| `Wednesday (Web Series 2022–) 720p` | kind=series, title="Wednesday", year=2022 |

### 3.4 Edge Cases

| Case | Input | Expected Behavior |
|------|-------|-------------------|
| Year group | `(2026)/` | Detected as group, walk into it |
| Year range (collection) | `DC Extended Universe (2008-2019)/` | Detected as group, walk into it |
| Old year group | `(1995) & Before/` | Detected as group |
| Special characters | `Se7en (1995)` | title="Se7en" |
| Unicode | `Amélie (2001)` | title="Amélie" |
| Very long title | `The Incredibly Strange Creatures Who Stopped Living and Became Mixed-Up Zombies (1964)` | Parsed correctly, truncated in UI |
| Empty folder | Folder exists but no .mkv | Show "No video available" |
| Multiple video files | Folder has movie.mkv and sample.mkv | Pick largest file |

---

## 4. Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Cold startup | <3 seconds | Time from process start to UI render |
| Warm startup | <1.5 seconds | Subsequent launches |
| Initial scan (1000 titles) | <30 seconds | Mock server with 1000 folders |
| Incremental scan (no changes) | <5 seconds | Full category list, no re-fetch |
| Search response | <200ms | FTS query on 38,000 titles |
| Category load | <500ms | Query + render 100 posters |
| Memory (idle) | <200MB | After startup, no playback |
| Memory (browsing) | <400MB | Scrolling through 1000 posters |
| Memory (playback) | <600MB | 1080p video playing |
| Memory leak test | <50MB growth/hour | Continuous browsing and playback |

### 4.1 Load Testing Matrix

| Scenario | Records | Concurrent Ops | Pass Criteria |
|----------|---------|----------------|---------------|
| Bulk insert | 38,000 titles | 1 | <60 seconds |
| Category query | 38,000 titles | 10 | <100ms each |
| FTS search | 38,000 titles | 5 | <200ms each |
| Poster fetch | 100 posters | 4 | <5s total |

---

## 5. Regression Test Checklist

**Critical Path Tests (must pass before any release):**

### 5.1 Startup & Data Integrity

- [ ] Fresh install starts without crash
- [ ] Upgrade from previous version preserves database
- [ ] Upgrade preserves watch history
- [ ] Corrupt database detected and offers reset
- [ ] WAL mode enabled (verify with PRAGMA)

### 5.2 Crawler

- [ ] h5ai parsing extracts all entries
- [ ] nginx autoindex parsing works
- [ ] Apache autoindex parsing works
- [ ] Movie regex matches sample titles
- [ ] Series regex matches sample titles
- [ ] Collection folders not treated as titles
- [ ] Incremental scan skips unchanged folders
- [ ] Concurrent requests ≤4 (verify via logging)
- [ ] Mark-and-sweep removes deleted titles
- [ ] Network timeout handled gracefully

### 5.3 Navigation

- [ ] All categories reachable
- [ ] Back button returns to previous view
- [ ] Scroll position restored on back
- [ ] Search accessible and functional
- [ ] Detail page loads from grid click
- [ ] Series page shows seasons

### 5.4 Playback

- [ ] Video starts playing (H.264)
- [ ] Seeking forward/backward works
- [ ] Audio track switching works
- [ ] Subtitle toggle works
- [ ] Progress saved on pause
- [ ] Progress saved on close
- [ ] Resume from saved position
- [ ] Mark watched at 95%
- [ ] Episode auto-advance works
- [ ] VLC launch works

### 5.5 Window Management

- [ ] Resize window: UI adapts
- [ ] Maximize/restore works
- [ ] Window position saved on close
- [ ] Window position restored on start
- [ ] Fullscreen video toggle
- [ ] Multi-monitor: opens on last-used monitor

---

## 6. Manual Test Procedures

### 6.1 Real ISP Server Crawling

**Prerequisites:**
- VPN or direct access to 172.16.x.x network
- At least one configured category URL

**Steps:**
1. Launch DhakaFlix with configured categories
2. Trigger "Rescan Library"
3. Observe progress indicator
4. Wait for completion
5. Verify title count matches approximate expected (±5%)
6. Spot-check 10 random titles exist on server
7. Verify posters load for checked titles

**Pass criteria:**
- Scan completes without error
- No duplicate titles
- Titles browsable in UI

### 6.2 Video Playback Quality

**Test matrix:**

| Video | Resolution | Codec | Audio | Expected |
|-------|------------|-------|-------|----------|
| Sample 1 | 720p | H.264 | AAC | Plays natively |
| Sample 2 | 1080p | H.264 | AAC | Plays natively |
| Sample 3 | 2160p | HEVC | AAC | Plays natively |
| Sample 4 | 1080p | H.264 | DTS | Audio fail, VLC fallback |
| Sample 5 | 720p | H.264 | Dual AAC | Track switching works |

**Steps per video:**
1. Navigate to video
2. Click Play
3. Verify playback starts within 5 seconds
4. Seek to middle of video
5. Verify audio is correct language
6. If dual audio, switch track
7. Toggle subtitles
8. Seek to 95%
9. Verify marked as watched

### 6.3 Codec Fallback Behavior

**Steps:**
1. Identify video with DTS audio
2. Attempt playback
3. Verify app shows warning or fails gracefully
4. Click "Open in VLC"
5. Verify VLC opens with correct URL
6. Verify playback in VLC works

**Pass criteria:**
- No crash on unsupported codec
- Clear user guidance
- VLC integration functional

### 6.4 Network Failure Recovery

**Steps:**
1. Start browsing normally
2. Disconnect network (disable adapter)
3. Attempt to browse new category
4. Verify error message shown
5. Reconnect network
6. Verify recovery without restart
7. During playback: disconnect briefly
8. Verify player buffers and resumes

**Pass criteria:**
- No crash on network loss
- Clear error messaging
- Automatic recovery when network returns

---

## 7. Bug Reporting Template

```markdown
## Bug Report

**Title:** [Brief description]

**Severity:** Critical | High | Medium | Low

**Environment:**
- DhakaFlix Version: 
- Windows Version: 
- RAM: 
- Display: 
- ISP/Network: 

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**


**Actual Result:**


**Frequency:** Always | Sometimes (X/Y attempts) | Once

**Evidence:**
- Screenshot/Recording: [attached]
- Log file: [attached from %APPDATA%/DhakaFlix/logs/]
- Console errors: 

**Workaround:** (if any)

**Related Issues:** #

---
Reporter: 
Date: 
```

### 7.1 Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| Critical | App unusable, data loss, security hole | Crash on startup, database corruption |
| High | Major feature broken, no workaround | Cannot play any video, search broken |
| Medium | Feature impaired, workaround exists | Resume off by >10s, poster load slow |
| Low | Minor issue, cosmetic | Tooltip misaligned, typo |

---

## 8. Test Coverage Matrix

| Component | Unit | Integration | E2E | Manual |
|-----------|------|-------------|-----|--------|
| h5ai Parser | ✓ | | | |
| nginx Parser | ✓ | | | |
| Apache Parser | ✓ | | | |
| Movie Regex | ✓ | | | |
| Series Regex | ✓ | | | |
| Crawler Walk | ✓ | ✓ | | ✓ |
| Incremental Scan | ✓ | ✓ | | |
| Mark-and-Sweep | ✓ | ✓ | | |
| Database CRUD | ✓ | ✓ | | |
| FTS Search | ✓ | ✓ | ✓ | |
| Category Query | ✓ | ✓ | ✓ | |
| Progress Save | ✓ | ✓ | ✓ | |
| Cinemeta Fetch | ✓ | ✓ | | ✓ |
| Video Playback | | | ✓ | ✓ |
| Seeking | | | ✓ | ✓ |
| Audio Switching | | | ✓ | ✓ |
| Subtitles | | | ✓ | ✓ |
| VLC Launch | | | ✓ | ✓ |
| Episode Advance | | | ✓ | ✓ |
| UI Navigation | | | ✓ | |
| Keyboard Shortcuts | | | ✓ | |
| Window Management | | | ✓ | |
| OTA Update | | | | ✓ |
| Install/Uninstall | | | | ✓ |

---

## 9. Risk-Based Test Priority

| Risk | Likelihood | Impact | Test Priority |
|------|------------|--------|---------------|
| Playback fails on common codec | Medium | Critical | P1 |
| Database corruption | Low | Critical | P1 |
| Crawler misses titles | Medium | High | P1 |
| Search returns wrong results | Medium | High | P1 |
| Progress not saved | Medium | High | P1 |
| Memory leak during playback | Medium | Medium | P2 |
| UI jank on large library | Medium | Medium | P2 |
| Cinemeta unavailable | Low | Low | P3 |
| Dark logo visibility | Low | Low | P3 |

---

## 10. Automation Framework Recommendations

### 10.1 Unit Testing (Jest)

```typescript
// Example: Parser unit test
describe('h5aiParser', () => {
  it('extracts movie folder with dual audio', () => {
    const html = loadFixture('h5ai-movie-listing.html');
    const entries = parseH5ai('/path/', html);
    
    expect(entries).toContainEqual({
      href: '/path/72%20Hours%20(2026)%20720p%20NF%20%5BDual%20Audio%5D/',
      name: '72 Hours (2026) 720p NF [Dual Audio]',
      dir: true,
      time: expect.any(Number),
      size: 0
    });
  });
});
```

### 10.2 Integration Testing (Jest + SQLite)

```typescript
// Example: Crawler + DB integration
describe('CrawlerIntegration', () => {
  let db: Database;
  let mockServer: MockServer;
  
  beforeEach(async () => {
    db = await createTestDatabase();
    mockServer = await createMockServer();
  });
  
  it('stores discovered titles in database', async () => {
    mockServer.addCategory('/movies/', ['Title A (2024)/', 'Title B (2023)/']);
    
    await crawl(db, mockServer.url + '/movies/');
    
    const titles = await db.getAllTitles();
    expect(titles).toHaveLength(2);
  });
});
```

### 10.3 E2E Testing (Playwright)

```typescript
// Example: Browse and play flow
test('user can browse and play a movie', async ({ electronApp }) => {
  const window = await electronApp.firstWindow();
  
  // Navigate to category
  await window.click('[data-testid="category-english"]');
  await expect(window.locator('.poster-grid')).toBeVisible();
  
  // Click first movie
  await window.click('.poster-card:first-child');
  await expect(window.locator('.detail-page')).toBeVisible();
  
  // Play movie
  await window.click('[data-testid="play-button"]');
  await expect(window.locator('video')).toBeVisible();
  
  // Verify playback started
  await window.waitForFunction(() => {
    const video = document.querySelector('video');
    return video && video.currentTime > 0;
  });
});
```

---

## 11. Appendix: Keyboard Shortcuts Test Matrix

| Shortcut | Context | Action | Test ID |
|----------|---------|--------|---------|
| Ctrl+K | Global | Open search | KBD-01 |
| Escape | Search | Close search | KBD-02 |
| Escape | Player | Exit fullscreen or player | KBD-03 |
| Space | Player | Play/Pause | KBD-04 |
| F | Player | Toggle fullscreen | KBD-05 |
| Left | Player | Seek -10s | KBD-06 |
| Right | Player | Seek +10s | KBD-07 |
| Ctrl+Left | Player | Seek -60s | KBD-08 |
| Ctrl+Right | Player | Seek +60s | KBD-09 |
| Up | Player | Volume +5% | KBD-10 |
| Down | Player | Volume -5% | KBD-11 |
| M | Player | Mute toggle | KBD-12 |
| Backspace | Navigation | Go back | KBD-13 |

---

## 12. Appendix: Windows Compatibility Matrix

| Windows Version | DPI | Test Status |
|-----------------|-----|-------------|
| Windows 10 21H2 | 100% | Required |
| Windows 10 21H2 | 125% | Required |
| Windows 10 21H2 | 150% | Required |
| Windows 11 23H2 | 100% | Required |
| Windows 11 23H2 | 125% | Required |
| Windows 11 23H2 | 150% | Required |
| Windows 11 23H2 | 200% | Recommended |

---

*Document Version: 1.0*  
*Created: 2026-11-22*  
*Based on: DhakaFlix Build Guide & REQUIREMENTS.md*
