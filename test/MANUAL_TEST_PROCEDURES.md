# DhakaFlix Manual Test Procedures

## 1. Real ISP Server Crawling

### Prerequisites
- [ ] VPN connected to ISP network (or direct access to 172.16.x.x)
- [ ] At least one category URL configured
- [ ] Fresh database (or cleared scan state)

### Procedure

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Launch DhakaFlix | App opens without error | |
| 2 | Open Settings | Settings page visible | |
| 3 | Verify category URLs | At least 1 URL configured | |
| 4 | Click "Rescan Library" | Progress indicator appears | |
| 5 | Observe progress | Shows: current category, folders scanned, titles found | |
| 6 | Wait for completion | Scan completes without error | |
| 7 | Check title count | Count matches expected (~38,000 ±5%) | |
| 8 | Navigate to English category | Grid populates with posters | |
| 9 | Spot-check 5 random titles | All have posters, correct metadata | |
| 10 | Check a 2026 movie | Recently added appears correctly | |

### Notes
- Expected scan time: 2-5 minutes for initial scan
- Incremental scan (no changes): <30 seconds
- Network should be stable; disconnects may cause incomplete scan

---

## 2. Video Playback Quality

### Test Matrix

| # | Video Sample | Resolution | Video Codec | Audio Codec | Expected Behavior |
|---|-------------|------------|-------------|-------------|-------------------|
| 1 | Sample_720p_h264_aac.mkv | 720p | H.264 | AAC | Native playback |
| 2 | Sample_1080p_h264_aac.mkv | 1080p | H.264 | AAC | Native playback |
| 3 | Sample_2160p_hevc_aac.mkv | 2160p | HEVC | AAC | Native playback |
| 4 | Sample_1080p_h264_dts.mkv | 1080p | H.264 | DTS | No audio, VLC fallback |
| 5 | Sample_720p_dual_audio.mkv | 720p | H.264 | AAC+AAC | Track switching |

### Procedure (per video)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to test video | Detail page shows | |
| 2 | Click Play | Player opens, video loads | |
| 3 | Observe first 10 seconds | Video plays smoothly | |
| 4 | Check audio | Correct language plays | |
| 5 | Seek to 50% | Playback continues from new position | |
| 6 | Seek to 25% (backwards) | Playback continues correctly | |
| 7 | Try arrow key seeking | ±10s per press works | |
| 8 | Open audio menu | Available tracks shown | |
| 9 | Switch audio track | Audio changes immediately | |
| 10 | Toggle subtitles | Subs appear/disappear | |
| 11 | Seek to 95% | Mark watched triggers | |
| 12 | Close player | Return to detail, watched indicator shown | |

### DTS Audio Test

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to DTS video | Detail page shows | |
| 2 | Click Play | Player opens | |
| 3 | Check audio | No audio or garbled audio | |
| 4 | Close player | Return to detail | |
| 5 | Click "Open in VLC" | VLC launches with video | |
| 6 | Verify VLC playback | Audio works in VLC | |

---

## 3. Progress Save & Resume

### Procedure

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start playing any movie | Playback begins | |
| 2 | Seek to 30 minutes | Position changes | |
| 3 | Wait 20 seconds | (Progress saves at 15s interval) | |
| 4 | Close player (X button) | Return to detail | |
| 5 | Check detail page | "Resume at 30:00" button shown | |
| 6 | Close app completely | App closes | |
| 7 | Relaunch app | App starts | |
| 8 | Navigate to same movie | Detail page shows | |
| 9 | Check resume button | Still shows "Resume at 30:00" | |
| 10 | Click Resume | Playback starts at ~30:00 (±2s) | |

---

## 4. TV Series Episode Flow

### Procedure

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to a TV series | Series detail page shows | |
| 2 | Check season selector | All seasons visible | |
| 3 | Default season | Season 1 selected (or last watched) | |
| 4 | Check episode list | Episodes sorted by S##E## | |
| 5 | Click Season 2 | Episodes update to S2 | |
| 6 | Click episode S02E01 | Playback starts | |
| 7 | Watch until 95% | Episode ends | |
| 8 | Observe auto-advance | S02E02 starts automatically | |
| 9 | Close during S02E02 | Player closes | |
| 10 | Reopen series | Default to Season 2 | |
| 11 | Check S02E01 | Marked as watched (checkmark) | |
| 12 | Check S02E02 | Shows resume position | |

---

## 5. Network Failure Recovery

### Procedure

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Launch app normally | App loads | |
| 2 | Browse to a category | Posters load | |
| 3 | **Disconnect network** | (disable adapter or unplug cable) | |
| 4 | Try browsing new category | Error message shown | |
| 5 | Check UI responsiveness | App doesn't freeze | |
| 6 | **Reconnect network** | | |
| 7 | Retry browsing | Content loads without restart | |
| 8 | Start video playback | Video plays | |
| 9 | **Disconnect briefly** (5s) | | |
| 10 | Observe player | Buffering indicator shown | |
| 11 | **Reconnect** | | |
| 12 | Observe recovery | Playback resumes automatically | |

---

## 6. Installation & Uninstallation

### Fresh Install Test

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Ensure no previous DhakaFlix | Check %APPDATA%, %LOCALAPPDATA% | |
| 2 | Run installer (DhakaFlix-Setup-x.x.x.exe) | Installer starts | |
| 3 | Follow install prompts | Installation completes | |
| 4 | Launch from Start menu | App starts | |
| 5 | Check for first-run experience | Setup wizard or settings shown | |
| 6 | Configure and scan | Library populates | |

### Upgrade Test

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Install older version | Previous version running | |
| 2 | Create watch history | Watch partial movie, complete another | |
| 3 | Close app | | |
| 4 | Run new installer | Upgrade proceeds | |
| 5 | Launch upgraded app | App starts | |
| 6 | Check database | All titles present | |
| 7 | Check watch history | Positions preserved | |
| 8 | Check settings | Settings preserved | |

### Uninstall Test

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open Windows Settings > Apps | | |
| 2 | Find DhakaFlix | App listed | |
| 3 | Click Uninstall | Uninstaller runs | |
| 4 | Choose "Keep user data" (if prompted) | | |
| 5 | Verify app removed | Not in Start menu | |
| 6 | Check %APPDATA%/DhakaFlix | Data folder remains (if kept) | |
| 7 | Reinstall | App installs | |
| 8 | Check data | Previous data available | |

---

## 7. OTA Update Test

### Procedure (requires update server)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Install older version | e.g., v1.0.0 | |
| 2 | Configure update server | Point to test update server | |
| 3 | Launch app | Update check starts | |
| 4 | Wait for notification | "Update available" shown | |
| 5 | View changelog | Version info and changes listed | |
| 6 | Click "Update Now" | Download starts | |
| 7 | Observe progress | Download % shown | |
| 8 | Wait for completion | "Restart to apply" prompt | |
| 9 | Click Restart | App closes and restarts | |
| 10 | Check version | New version running | |
| 11 | Check data integrity | Library and history intact | |

---

## 8. DPI Scaling Test

### Test at each DPI level: 100%, 125%, 150%, 200%

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set Windows display scale | System Settings > Display | |
| 2 | Launch DhakaFlix | App opens | |
| 3 | Check sidebar | Text readable, icons correct size | |
| 4 | Check poster grid | Posters not pixelated or cut off | |
| 5 | Check detail page | All text readable | |
| 6 | Check player controls | Buttons clickable, not overlapping | |
| 7 | Check search modal | Input field properly sized | |
| 8 | Resize window | Layout adapts correctly | |

---

## 9. Memory Leak Test

### Procedure (1-hour test)

| Step | Action | Notes |
|------|--------|-------|
| 1 | Launch Task Manager | Monitor DhakaFlix.exe memory | |
| 2 | Record initial memory | ______ MB | |
| 3 | Browse 10 categories | | |
| 4 | Search 5 different terms | | |
| 5 | Open 10 detail pages | | |
| 6 | Play 3 videos (2 min each) | | |
| 7 | Record memory at 15 min | ______ MB | |
| 8 | Repeat steps 3-6 | | |
| 9 | Record memory at 30 min | ______ MB | |
| 10 | Repeat steps 3-6 | | |
| 11 | Record memory at 45 min | ______ MB | |
| 12 | Repeat steps 3-6 | | |
| 13 | Record memory at 60 min | ______ MB | |

**Pass criteria:** Memory growth < 50MB over 1 hour

---

## 10. Keyboard Navigation

### Full keyboard-only test

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Launch app | | |
| 2 | Press Tab repeatedly | Focus moves through sidebar | |
| 3 | Press Enter on category | Grid loads | |
| 4 | Tab to poster grid | Focus enters grid | |
| 5 | Arrow keys in grid | Selection moves | |
| 6 | Enter on poster | Detail opens | |
| 7 | Tab to Play button | Focus on Play | |
| 8 | Enter to play | Video starts | |
| 9 | Space to pause | Video pauses | |
| 10 | Arrows to seek | Position changes | |
| 11 | Escape to exit | Returns to detail | |
| 12 | Backspace | Returns to grid | |
| 13 | Ctrl+K | Search opens | |
| 14 | Type and Enter | Search executes | |
| 15 | Escape | Search closes | |

---

## Test Sign-Off

| Tester Name | Date | Build Version | Overall Result |
|-------------|------|---------------|----------------|
| | | | |

### Critical Issues Found
1. 
2. 
3. 

### Non-Critical Issues Found
1. 
2. 
3. 

### Notes

