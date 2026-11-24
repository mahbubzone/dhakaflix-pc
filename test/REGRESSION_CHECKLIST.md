# DhakaFlix Regression Test Checklist

## Pre-Release Checklist

**Version:** _______________  
**Tester:** _______________  
**Date:** _______________  
**Build:** _______________  

---

## 1. Critical Path Tests

### 1.1 Application Startup
- [ ] App launches without crash
- [ ] App loads within 5 seconds
- [ ] Database loads/creates successfully
- [ ] WAL mode verified (PRAGMA journal_mode = wal)

### 1.2 Crawler
- [ ] h5ai listings parse correctly
- [ ] nginx autoindex listings parse correctly
- [ ] Apache autoindex listings parse correctly
- [ ] Movie folders detected with title regex
- [ ] Series folders detected with series regex
- [ ] Event folders detected with event regex
- [ ] Collection folders NOT treated as titles
- [ ] Year groups NOT treated as titles
- [ ] Incremental scan skips unchanged directories
- [ ] Concurrent requests ≤ 4 (verify in logs)
- [ ] Mark-and-sweep removes deleted titles
- [ ] Network timeouts handled gracefully

### 1.3 Database Operations
- [ ] Movies inserted correctly
- [ ] Movies queried by category
- [ ] Full-text search returns results
- [ ] Progress saved to database
- [ ] Progress retrieved from database
- [ ] Metadata cached correctly
- [ ] Directory times stored for incremental scan

### 1.4 Navigation
- [ ] Sidebar categories clickable
- [ ] Category loads poster grid
- [ ] Poster grid scrolls smoothly
- [ ] Clicking poster opens detail
- [ ] Back button returns to previous view
- [ ] Scroll position restored on back
- [ ] Search opens with Ctrl+K
- [ ] Search returns results
- [ ] Search result navigates to detail
- [ ] Escape closes search

### 1.5 Playback
- [ ] Play button starts video
- [ ] Video plays in player
- [ ] Space pauses/resumes
- [ ] Arrow keys seek (±10s)
- [ ] F toggles fullscreen
- [ ] Escape exits player
- [ ] Audio track switching works
- [ ] Subtitle toggle works
- [ ] Progress saved on pause
- [ ] Progress saved on close
- [ ] Resume button appears for partial watch
- [ ] Resume starts at saved position (±2s)
- [ ] Mark watched at 95%

### 1.6 TV Series
- [ ] Series page shows seasons
- [ ] Season selector changes episodes
- [ ] Episodes sorted correctly (S01E01 < S01E10)
- [ ] Episode progress tracked individually
- [ ] Auto-advance to next episode
- [ ] Last watched season remembered

### 1.7 VLC Fallback
- [ ] "Open in VLC" button visible
- [ ] VLC launches with correct URL
- [ ] VLC fallback suggested for DTS audio

### 1.8 Window Management
- [ ] Window resizes correctly
- [ ] UI adapts to window size
- [ ] Window position saved
- [ ] Window position restored on restart
- [ ] Fullscreen video works
- [ ] Exit fullscreen works

---

## 2. Performance Benchmarks

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Cold startup | < 3s | | [ ] |
| Warm startup | < 1.5s | | [ ] |
| Initial scan (1000 titles) | < 30s | | [ ] |
| Incremental scan (no changes) | < 5s | | [ ] |
| Search response | < 200ms | | [ ] |
| Category load | < 500ms | | [ ] |
| Memory (idle) | < 200MB | | [ ] |
| Memory (browsing) | < 400MB | | [ ] |
| Memory (playback) | < 600MB | | [ ] |

---

## 3. Upgrade Testing

- [ ] Upgrade from previous version succeeds
- [ ] Database preserved after upgrade
- [ ] Watch history preserved
- [ ] Settings preserved
- [ ] No duplicate entries after upgrade

---

## 4. Platform Testing

### Windows 10
- [ ] Install on clean Win10
- [ ] All features functional
- [ ] Uninstall clean

### Windows 11
- [ ] Install on clean Win11
- [ ] All features functional
- [ ] Uninstall clean

### DPI Scaling
- [ ] 100% scaling renders correctly
- [ ] 125% scaling renders correctly
- [ ] 150% scaling renders correctly
- [ ] 200% scaling renders correctly (if applicable)

---

## 5. Error Handling

- [ ] Network disconnect: error shown, no crash
- [ ] Network reconnect: recovery without restart
- [ ] Missing video file: error shown
- [ ] Corrupt database: detected, reset option
- [ ] Invalid URL: validation error
- [ ] Empty search results: empty state shown

---

## 6. Security & Privacy

- [ ] No sensitive data in logs
- [ ] Database not accessible without admin
- [ ] No external analytics/tracking
- [ ] Updates served over HTTPS (when implemented)

---

## 7. Known Issues

Document any known issues that are accepted for this release:

| Issue | Severity | Workaround | Ticket |
|-------|----------|------------|--------|
| | | | |
| | | | |
| | | | |

---

## Sign-Off

### Test Results Summary

| Category | Pass | Fail | Skip | Total |
|----------|------|------|------|-------|
| Startup | | | | |
| Crawler | | | | |
| Database | | | | |
| Navigation | | | | |
| Playback | | | | |
| Series | | | | |
| VLC | | | | |
| Window | | | | |
| Performance | | | | |
| Upgrade | | | | |
| Platform | | | | |
| Error Handling | | | | |
| **TOTAL** | | | | |

### Blockers for Release

- [ ] None - ready for release
- [ ] Blockers exist (list below):

1. 
2. 
3. 

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

**Release Decision:**

- [ ] **APPROVED** for release
- [ ] **REJECTED** - requires fixes
- [ ] **CONDITIONAL** - approved with known issues documented

Notes:
